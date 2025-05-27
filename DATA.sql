-- function to check correct credentials and return user id
CREATE OR REPLACE FUNCTION get_user_id_by_credentials(
	username_input VARCHAR, 
	password_input VARCHAR)
RETURNS INT AS $$
DECLARE 
    temp_id INT;
BEGIN
    SELECT user_id INTO temp_id
    FROM user_data
    WHERE user_name = username_input
	AND user_password = password_input;
	  
	IF temp_id IS NULL 
	THEN RETURN 0;
	ELSE RETURN temp_id;
	END IF;
END;
$$ LANGUAGE plpgsql;



-- procedure to store a user into the user_data table
CREATE OR REPLACE PROCEDURE insert_user(
	username_input 	VARCHAR, 
	password_input 	VARCHAR,
	role_input 		INTEGER
	) AS $$
BEGIN
    INSERT INTO user_data(username, user_password, user_role)
    VALUES(username_input, password_input, role_input);
END;
$$ LANGUAGE plpgsql;



-- procedure to increase/upgrade state to next stage
CREATE OR REPLACE PROCEDURE upgrade_state(
	request_id_input 	INT,
	new_state_input 	INT,
	state_name_input 	VARCHAR,
	comment_input 		TEXT
	) AS $$
BEGIN
	-- update current state in request_table to new
    UPDATE request_table
	SET current_state = new_state_input
	WHERE request_id = request_id_input;

	-- update the previous's state end date
	UPDATE state_table
	SET date_end = CURRENT_TIMESTAMP,
		completed = true
	WHERE (request_id = request_id_input
	AND state_type = (new_state_input - 1));

	-- make new entry for new state in state_tabel
	INSERT INTO state_table(state_type, state_name, request_id, start_comment)
    VALUES(new_state_input, state_name_input, request_id_input, comment_input);
END;
$$ LANGUAGE plpgsql;



-- procedure to decrease/degrade state when rejected
CREATE OR REPLACE PROCEDURE degrade_state(
    request_id_input    INT,
    new_state_input     INT,
    state_name_input    VARCHAR,
    comment_input       TEXT	
)
AS $$
BEGIN
    -- Update current state in request_table to new (degraded) state
    UPDATE request_table
    SET current_state = new_state_input
    WHERE request_id = request_id_input;

    -- Reactivate the degraded state
    UPDATE state_table
    SET date_end = NULL,
        completed = false,
        start_comment = 'REJECTED: ' || comment_input
    WHERE request_id = request_id_input
      AND state_type = new_state_input;

    -- Delete the state entry above the rejected one
    DELETE FROM state_table
    WHERE request_id = request_id_input
      AND state_type = new_state_input + 1;
END;
$$ LANGUAGE plpgsql;



-- Procedure to create new request
CREATE OR REPLACE PROCEDURE create_new_request(
    request_title_input         VARCHAR, 
    user_id_input               INTEGER,
    requester_name_input        VARCHAR,
    analysis_purpose_input      TEXT,
    requested_finish_date_input TIMESTAMP,
    pic_submitter_input         VARCHAR,
    urgent_input                BOOLEAN,
    requirement_type_input      SMALLINT,
    required_data_input         VARCHAR			
)
AS $$
DECLARE 
    temp_req_id INT;
BEGIN
    -- INSERT REQUIREMENT INTO TABLE AND RETURN ID TO CONNECT WITH REQUEST 
    INSERT INTO requirement_table(requirement_type, required_data)
    VALUES (requirement_type_input, required_data_input)
	 RETURNING requirement_id INTO temp_req_id;
	 
    -- INSERT NEW REQUEST
    INSERT INTO request_table(
        request_title,
        user_id, 
        requester_name, 
        analysis_purpose,
        requested_completed_date,
        pic_submitter,
        urgent,
		requirement_id
    )
    VALUES (
        request_title_input,
        user_id_input, 
        requester_name_input, 
        analysis_purpose_input,
        requested_finish_date_input,
        pic_submitter_input,
        urgent_input,
		temp_req_id
    );

    -- INSERT THE FIRST STATE FOR THE REQUEST
    INSERT INTO state_table(state_type, state_name, request_id)
    VALUES (1, 'submitted', temp_req_id);
END;
$$ LANGUAGE plpgsql;



-- function to get all data from any table
CREATE OR REPLACE FUNCTION get_all(tab_name VARCHAR)
RETURNS JSON AS $$
DECLARE
    result_json JSON;
BEGIN
    EXECUTE format('SELECT json_agg(t) FROM %I t', tab_name) INTO result_json;
    RETURN result;
END;
$$ LANGUAGE plpgsql;




-- function to get data for data table
CREATE OR REPLACE FUNCTION get_view_data(
	range_input 		INT, 
	state_type_input	INT,
	-- DATA FORMAT, 1 FOR STATE SPECIFIC, 2 FOR CURRENT STATE, 
	-- 3 FOR COMPLETE
	data_format 		INT,
	user_id_input		INT,
	request_id_input	INT
	)
RETURNS JSON AS $$
DECLARE
    result_json JSON;
    start_date DATE;
    end_date DATE := CURRENT_DATE;
BEGIN
    start_date := CASE range_input
        WHEN 1 THEN date_trunc('week', CURRENT_DATE)::date                 
        WHEN 2 THEN date_trunc('month', CURRENT_DATE)::date                 
        WHEN 3 THEN date_trunc('quarter', CURRENT_DATE)::date               
        WHEN 4 THEN date_trunc('year', CURRENT_DATE)::date                  
    END;

	IF data_format = 1 THEN
	    SELECT json_agg(row_to_json(t))
	    INTO result_json
	    FROM (
	        SELECT 
	            r.request_id,
	            r.request_title,
	            u.user_name, 
	            s.state_name,
	            s.date_start,
	            s.date_end,
	            s.completed
	        FROM 
	            request_table r
	        JOIN 
	            state_table s ON r.request_id = s.request_id
	        JOIN
	            user_table u ON r.user_id = u.user_id
	        WHERE 
	            r.request_date >= start_date
	            AND r.request_date  <= end_date
				AND s.state_type = state_type_input
	    ) t;
	ELSE IF data_format = 2 THEN
		SELECT json_agg(row_to_json(t))
	    INTO result_json
	    FROM (
	        SELECT 
	            r.request_id,
	            r.request_title,
				r.request_date,
	            u.user_name, 
	            s.state_name,
	            s.completed
	        FROM 
	            request_table r
	        JOIN 
	            state_table s ON r.request_id = s.request_id
	        JOIN
	            user_table u ON r.user_id = u.user_id
	        WHERE 
	            r.request_date >= start_date
	            AND r.request_date  <= end_date
	    ) t;
	ELSE IF data_format = 3 THEN
			SELECT json_agg(row_to_json(t))
	    INTO result_json
	    FROM (
	        SELECT 
	            r.request_id,
	            r.request_title,
				r.current_state
        		r.user_id, 
        		r.requester_name, 
        		r.analysis_purpose,
       			r.requested_completed_date,
        		r.pic_submitter,
        		r.urgent,
				r.request_date,
	            u.user_name, 
	            s.state_name
	        FROM 
	            request_table r
	        JOIN 
	            state_table s ON r.request_id = s.request_id
	        JOIN
	            user_table u ON r.user_id = u.user_id
	        WHERE 
	            r.request_id = 
	    ) t;
	END IF;
    RETURN result_json;
END;
$$ LANGUAGE plpgsql;




-- CREATE OR REPLACE FUNCTION get_todo_data()
-- RETURNS JSON AS $$
-- DECLARE
--     result_json JSON;
-- BEGIN
--     SELECT json_agg(row_to_json(t))
--     INTO result_json
--     FROM (
--         SELECT 
--             r.request_id,
--             r.request_title,
--             u.user_name, 
--             s.state_name,
--         FROM 
--             request_table r
--         JOIN 
--             state_table s ON r.request_id = s.request_id
--         JOIN
--             user_table u ON r.user_id = u.user_id
-- 		WHERE
--         -- ORDER BY r.request_id, s.state_type
--     ) t;

--     RETURN result_json;
-- END;
-- $$ LANGUAGE plpgsql;

-- test get all
DO
$$
BEGIN
	SELECT get_all('request');
END;
$$ LANGUAGE plpgsql;

-- test get user credentials
SELECT get_user_id_by_credentials('Alto', '1234')

-- clear all data in table
TRUNCATE TABLE user_table;
TRUNCATE TABLE request_table;
TRUNCATE TABLE state_table;
TRUNCATE TABLE requirement_table;


-- insert dummy user
INSERT INTO user_table (user_name, user_password, user_role, email, nik, position, department) VALUES
('alice',   '1234', 1, 'alice@example.com',   1001, 'Manager',      'HR'),
('bob',     '1234', 2, 'bob@example.com',     1002, 'Staff',        'Finance'),
('carol',   '1234', 3, 'carol@example.com',   1003, 'Supervisor',   'IT'),
('dave',    '1234', 1, 'dave@example.com',    1004, 'Manager',      'IT'),
('eve',     '1234', 2, 'eve@example.com',     1005, 'Staff',        'HR'),
('frank',   '1234', 3, 'frank@example.com',   1006, 'Supervisor',   'Finance'),
('grace',   '1234', 1, 'grace@example.com',   1007, 'Manager',      'Marketing'),
('heidi',   '1234', 2, 'heidi@example.com',   1008, 'Staff',        'Marketing'),
('ivan',    '1234', 3, 'ivan@example.com',    1009, 'Supervisor',   'IT'),
('judy',    '1234', 1, 'judy@example.com',    1010, 'Manager',      'Finance');

-- insert dummy request
CALL create_new_request('Sales Report Q1'::VARCHAR, 14, 'alice'::VARCHAR, 'Analyze Q1 sales trends'::TEXT, '2024-01-20 17:00:00'::TIMESTAMP, 'alice'::VARCHAR, false, 1::SMALLINT, 'raw'::VARCHAR);
CALL create_new_request('Inventory Audit', 15, 'bob', 'Check inventory discrepancies', '2024-02-15 17:00:00', 'bob', true, 2, 'db');
CALL create_new_request('Customer Feedback', 16, 'carol', 'Summarize customer feedback', '2024-03-10 17:00:00', 'carol', false, 3, 'dashboard');
CALL create_new_request('IT Upgrade', 17, 'dave', 'Plan for new hardware', '2024-03-25 17:00:00', 'dave', true, 1, 'db');
CALL create_new_request('HR Survey', 18, 'eve', 'Analyze employee satisfaction', '2024-04-10 17:00:00', 'eve', false, 2, 'dashboard');
CALL create_new_request('Budget Review', 19, 'frank', 'Review Q2 budget allocations', '2024-04-30 17:00:00', 'frank', false, 3, 'raw');
CALL create_new_request('Marketing Plan', 20, 'grace', 'Draft new marketing strategy', '2024-05-15 17:00:00', 'grace', true, 1, 'dashboard');
CALL create_new_request('Security Audit', 21, 'heidi', 'Assess system vulnerabilities', '2024-05-28 17:00:00', 'heidi', false, 2, 'db');
CALL create_new_request('Supplier Evaluation', 22, 'ivan', 'Evaluate new suppliers', '2024-06-11 17:00:00', 'ivan', true, 3, 'raw');
CALL create_new_request('Website Redesign', 23, 'judy', 'Plan new website layout', '2024-06-25 17:00:00', 'judy', false, 1, 'dashboard');

-- set all name lower case
UPDATE user_table
SET user_name = LOWER(user_name);


UPDATE request_table
SET user_id = 3
WHERE request_id = 13;

SELECT get_user_id('alo', '1234')

INSERT INTO state_table(state_type, state_name, request_id)
VALUES(1, 'SUBMITTED', 1);

-- Dummy 1
CALL create_new_request(
    'Sales Data Analysis'::VARCHAR,
    1::SMALLINT,
    'Alice'::VARCHAR,
    'To understand Q1 sales trends',
    CURRENT_DATE + INTERVAL '7 days',
    'Bob'::VARCHAR,
    true,
    1::SMALLINT,
    'raw data'::VARCHAR
);

-- Dummy 2
CALL create_new_request(
    'Customer Segmentation',
    '2',
    'Charlie',
    'Cluster customers by behavior',
    CURRENT_DATE + INTERVAL '10 days',
    'Dana',
    false,
    2,
    'database'
);

-- Dummy 3
CALL create_new_request(
    'Website Traffic Report',
    '3',
    'Eve',
    'Analyze visitor drop-off rates',
    CURRENT_DATE + INTERVAL '5 days',
    'Frank',
    true,
    1,
    'raw data'
);

-- Dummy 4
CALL create_new_request(
    'Inventory Optimization',
    '4',
    'Grace',
    'Determine optimal reorder points',
    CURRENT_DATE + INTERVAL '14 days',
    'Hank',
    false,
    3,
    'dashboard'
);

-- Dummy 5
CALL create_new_request(
    'Ad Campaign Performance',
    '5',
    'Ivy',
    'Compare ad channel efficiency',
    CURRENT_DATE + INTERVAL '3 days',
    'Jake',
    true,
    1,
    'raw data'
);

CALL update_state(13, 3, 'in progress');

SELECT current_state, request_title FROM request_table
WHERE request_id = 13;

-- VIEW USER_TABLE
SELECT * FROM public.user_table
ORDER BY user_id ASC 

-- VIEW REQUEST_TABLE
SELECT * FROM public.request_table
ORDER BY request_id ASC 

-- VIEW REQUIREMENT_TABLE
SELECT * FROM public.requirement_table
ORDER BY requirement_id ASC 
