-- FUNCTION TO CHECK CORRECT CREDENTIALS AND RETURN USER ID
CREATE OR REPLACE FUNCTION get_user_id_by_credentials(
	username_input VARCHAR, 
	password_input VARCHAR)
RETURNS INT AS $$
DECLARE 
    temp_id INT;
BEGIN
	-- GET THE USER ID OF THE USER WITH THE EXACT NAME AND PASSWORD
    SELECT user_id INTO temp_id
    FROM user_data
    WHERE user_name = username_input
	AND user_password = password_input;

	-- IF THERE IS NO EXACT MATCH THAT MEANS THAT THE LOGIN IS INVALID
	IF temp_id IS NULL 
	THEN RETURN 0;
	-- IF ID FOUND THEN RETURN THE USER ID 
	ELSE RETURN temp_id;
	END IF;
END;
$$ LANGUAGE plpgsql;



-- PROCEDURE TO STORE A USER INTO THE USER_DATA TABLE
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



-- PROCEDURE TO INCREASE/UPGRADE STATE TO NEXT STAGE
CREATE OR REPLACE PROCEDURE upgrade_state(
	request_id_input 	INT,
	comment_input 		TEXT DEFAULT NULL
) AS $$
DECLARE 
    temp_state_id INT;
BEGIN
	-- UPDATE CURRENT STATE IN REQUEST_TABLE TO NEW
    UPDATE request_table
	SET current_state = current_state + 1
	WHERE request_id = request_id_input
	RETURNING current_state INTO temp_state_id;

	-- UPDATE THE PREVIOUS STATE'S END DATE
	UPDATE state_table
	SET date_end = CURRENT_TIMESTAMP,
		completed = true
	WHERE request_id = request_id_input
	  AND state_name_id = temp_state_id - 1;

	-- INSERT NEW ENTRY FOR NEW STATE IN STATE_TABLE
	INSERT INTO state_table(state_name_id, request_id, start_comment)
    VALUES(temp_state_id, request_id_input, comment_input);
END;
$$ LANGUAGE plpgsql;



-- PROCEDURE TO DECREASE/DEGRADE STATE WHEN REJECTED
CREATE OR REPLACE PROCEDURE degrade_state(
    request_id_input    INT,
    comment_input       TEXT DEFAULT NULL	
)
AS $$
DECLARE 
    temp_state_id INT;
BEGIN
    -- UPDATE CURRENT STATE IN REQUEST_TABLE TO OLD (DEGRADED) STATE
    UPDATE request_table
	SET current_state = current_state - 1
	WHERE request_id = request_id_input
	RETURNING current_state INTO temp_state_id;

    -- RESTART THE OLD STATE
    UPDATE state_table
    SET date_end = NULL,
        completed = false,
        start_comment = 'REJECTED: ' || comment_input
	WHERE request_id = request_id_input
	  AND state_name_id = temp_state_id;

    -- DELETE THE STATE ENTRY OF THE DELETED
    DELETE FROM state_table
    WHERE request_id = request_id_input
      AND state_name_id = temp_state_id + 1;
END;
$$ LANGUAGE plpgsql;



-- PROCEDURE TO CREATE NEW REQUEST AND START WITH NEW STATE
CREATE OR REPLACE PROCEDURE create_new_request(
    request_title_input         VARCHAR, 
    user_id_input               INTEGER,
    requester_name_input        VARCHAR,
    analysis_purpose_input      TEXT,
    requested_finish_date_input TIMESTAMP,
    pic_submitter_input         VARCHAR,
    urgent_input                BOOLEAN,
    requirement_type_input      INT,
    required_data_input         VARCHAR			
)
AS $$
DECLARE 
    temp_request_id INT;
	temp_requirement_id INT;
BEGIN
    -- INSERT REQUIREMENT INTO TABLE AND RETURN ID TO CONNECT WITH REQUEST 
    INSERT INTO requirement_table(requirement_type, required_data)
    VALUES (requirement_type_input, required_data_input)
	RETURNING requirement_id INTO temp_requirement_id;
	 
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
		temp_requirement_id
    ) RETURNING request_id INTO temp_request_id;

    -- INSERT THE FIRST STATE FOR THE REQUEST
    INSERT INTO state_table(state_name_id, request_id)
    VALUES (1, temp_request_id);
END;
$$ LANGUAGE plpgsql;




-- FUCNTION TO GET SIMPLE DATA FOR SPECIFIC STATE
-- USED FOR PROGRESS PAGE WHEN PICKING SPECIFIC STATE TO VIEW
CREATE OR REPLACE FUNCTION get_state_specific_data(
	range_input INT, 
	state_name_id_input INT
	)
RETURNS JSON AS $$
DECLARE
    result_json JSON;
    start_date TIMESTAMP;
    end_date TIMESTAMP := CURRENT_TIMESTAMP;
BEGIN
    start_date := CASE range_input
        WHEN 1 THEN date_trunc('week', CURRENT_DATE)::TIMESTAMP                 
        WHEN 2 THEN date_trunc('month', CURRENT_DATE)::TIMESTAMP                 
        WHEN 3 THEN date_trunc('quarter', CURRENT_DATE)::TIMESTAMP              
        WHEN 4 THEN date_trunc('year', CURRENT_DATE)::TIMESTAMP                  
    END;
	SELECT json_agg(row_to_json(t))
	INTO result_json
	FROM (
		SELECT 
			r.request_id,
			r.request_title,
			r.user_id,
			u.user_name, 
			n.state_name,
			s.date_start,
			s.date_end,
			s.completed
		FROM request_table r
		JOIN state_table s ON r.request_id = s.request_id
		JOIN user_table u ON r.user_id = u.user_id
		JOIN state_name_table n ON s.state_name_id = n.state_name_id
		WHERE r.request_date >= start_date
			AND r.request_date  <= end_date
			AND s.state_name_id = state_name_id_input 
	) t;
    RETURN result_json;
END;
$$ LANGUAGE plpgsql;

-- FUCTION TO GET SIMPLE DATA OF THE USER'S REQUESTS
-- USED FOR USER PROGRESS VIEW
CREATE OR REPLACE FUNCTION get_user_request_data(
	user_id_input		INT
	)
RETURNS JSON AS $$
DECLARE
    result_json JSON;
BEGIN
	SELECT json_agg(row_to_json(t))
	INTO result_json
	FROM (
		SELECT 
			r.request_id,
			r.request_title,
			n.state_name
		FROM request_table r
		JOIN state_name_table n ON r.current_state = n.state_name_id
		WHERE r.user_id = user_id_input
	) t;
    RETURN result_json;
END;
$$ LANGUAGE plpgsql;

-- FUNCTION TO GET DATA RELEVANT TO THE USER'S TODO
CREATE OR REPLACE FUNCTION get_todo_data(
    user_role_input INT
)
RETURNS JSON AS $$
DECLARE
    result_json JSON;
    viewable INT[];
BEGIN
    IF user_role_input = 2 THEN viewable := ARRAY[2,3,4,5];
    ELSIF user_role_input = 3 THEN viewable := ARRAY[1,2,4,5];
    END IF;

    SELECT json_agg(row_to_json(t))
    INTO result_json
    FROM (
        SELECT 
            r.request_id,
            r.request_title,
            r.user_id, 
            s.state_name_id,
            s.date_start
        FROM request_table r
        JOIN user_table u ON r.user_id = u.user_id 
        JOIN state_table s ON r.request_id = s.request_id
        WHERE s.state_name_id = ANY(viewable)
			AND s.state_name_id = r.current_state
    ) t;
    RETURN result_json;
END;
$$ LANGUAGE plpgsql;


-- FUNCTION TO GET THE COMPLETE DATA OF A SPECIFIC REQUEST
-- USED FOR 'MORE DETAILS'
CREATE OR REPLACE FUNCTION get_complete_data_of_request(	
	request_id_input	INT
	)
RETURNS JSON AS $$
DECLARE
    result_json JSON;
BEGIN
	SELECT json_agg(row_to_json(t))
	INTO result_json
	FROM (
		SELECT 
			r.request_id,
			r.request_title,
			r.requester_name, 
			r.analysis_purpose,
			r.requested_completed_date,
			r.pic_submitter,
			r.urgent,
			r.request_date,
			u.user_name, 
			n.state_name
		FROM request_table r
		JOIN user_table u ON r.user_id = u.user_id
		JOIN state_name_table n ON r.current_state = n.state_name_id
		WHERE r.request_id = request_id_input
	) t;
    RETURN result_json;
END;
$$ LANGUAGE plpgsql;



-- TEST TO GET USER ID FROM CREDENTIAL CHECK
SELECT get_user_id_by_credentials('Alto', '1234')

-- CLEAR DATA WITHIN TABLE
TRUNCATE TABLE user_table;
TRUNCATE TABLE request_table;
TRUNCATE TABLE state_table;
TRUNCATE TABLE requirement_table;

-- INSERT MAPPING OF STATE NAME AND ID
INSERT INTO state_name_table (state_name_id, state_name)
values
(0, 'REJECTED'),
(1, 'SUBMITTED'),
(2, 'VALIDATED'),
(3, 'IN PROGRESS'),
(4, 'WAITING FOR REVIEW'),
(5, 'DONE');

-- INSERT DUMMY USER
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

CALL create_new_request('Sales Report Q1', 14, 'alice', 'Analyze Q1 sales trends', '2024-01-20 17:00:00', 'alice', false, 1, 'raw');
CALL create_new_request('Inventory Audit', 15, 'bob', 'Check inventory discrepancies', '2024-02-15 17:00:00', 'bob', true, 2, 'db');
CALL create_new_request('Customer Feedback', 16, 'carol', 'Summarize customer feedback', '2024-03-10 17:00:00', 'carol', false, 3, 'dashboard');
CALL create_new_request('IT Upgrade', 17, 'dave', 'Plan for new hardware', '2024-03-25 17:00:00', 'dave', true, 1, 'db');
CALL create_new_request('HR Survey', 18, 'eve', 'Analyze employee satisfaction', '2024-04-10 17:00:00', 'eve', false, 2, 'db');
CALL create_new_request('Budget Review', 19, 'frank', 'Review Q2 budget allocations', '2024-04-30 17:00:00', 'frank', false, 3, 'dashboard');
CALL create_new_request('Marketing Plan', 20, 'grace', 'Draft new marketing strategy', '2024-05-15 17:00:00', 'grace', true, 1, 'raw');
CALL create_new_request('Security Audit', 21, 'heidi', 'Assess system vulnerabilities', '2024-05-28 17:00:00', 'heidi', false, 2, 'db');
CALL create_new_request('Supplier Evaluation', 22, 'ivan', 'Evaluate new suppliers', '2024-06-11 17:00:00', 'ivan', true, 3, 'dashboard');
CALL create_new_request('Website Redesign', 23, 'judy', 'Plan new website layout', '2024-06-25 17:00:00', 'judy', false, 1, 'raw');

-- set all name lower case
UPDATE user_table
SET user_name = LOWER(user_name);


UPDATE request_table
SET user_id = 3
WHERE request_id = 13;

SELECT get_user_id('alo', '1234')

INSERT INTO state_table(state_type, state_name, request_id)
VALUES(1, 'SUBMITTED', 1);


CALL upgrade_state(13, 3, 'in progress');

-- TEST TO GET DATA WHERE RANGE = WEEK AND STATE SUBMITTED
SELECT get_state_specific_data(1,1)


SELECT get_complete_data_of_request(14,1)

SELECT current_state, request_title FROM request_table
WHERE request_id = 13;

ALTER SEQUENCE user_data_user_id_seq RESTART WITH 0;
SELECT setval(pg_get_serial_sequence('request_table', 'request_id'), COALESCE(max(request_id) + 1, 1), false)
FROM   request_table;
SELECT setval(pg_get_serial_sequence('requirement_table', 'requirement_id'), COALESCE(max(requirement_id) + 1, 1), false)
FROM   requirement_table;
SELECT setval(pg_get_serial_sequence('state_table', 'state_id'), COALESCE(max(state_id) + 1, 1), false)
FROM   state_table;

-- VIEW USER_TABLE
SELECT * FROM public.user_table
ORDER BY user_id ASC 

-- VIEW REQUEST_TABLE
SELECT * FROM public.request_table
ORDER BY request_id ASC 

-- VIEW REQUIREMENT_TABLE
SELECT * FROM public.requirement_table
ORDER BY requirement_id ASC 

select date_trunc('week', CURRENT_DATE)
