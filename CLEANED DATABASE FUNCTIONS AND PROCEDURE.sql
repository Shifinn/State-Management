-- Verifies user credentials and returns user details as a JSON object.
-- Returns user data on success or a default object on failure.
CREATE OR REPLACE FUNCTION get_user_id_by_credentials(
    username_input VARCHAR,
    password_input VARCHAR
)
RETURNS JSON AS $$
DECLARE
    result_json JSON;
BEGIN
    -- Find user by credentials and cast the row to a JSON object.
    -- Aliases are in camelCase to match JSON conventions.
    SELECT
        row_to_json(t)
    INTO
        result_json
    FROM (
        SELECT
            u.user_id AS "userId",
            u.user_name AS "userName",
            u.email,
            ur.role_id AS "roleId"
        FROM
            user_table u
        JOIN
            user_role_table ur ON u.user_id = ur.user_id
        WHERE
            LOWER(u.user_name) = LOWER(username_input) AND u.user_password = password_input
        LIMIT 1
    ) t;

    -- If no user was found, return a default JSON object.
    IF result_json IS NULL THEN
        result_json := json_build_object(
            'userId', 0,
            'userName', '0',
            'email', '0',
            'roleId', 0
        );
    END IF;

    RETURN result_json;
END;
$$ LANGUAGE plpgsql;


-- Advances a request to the next state.
CREATE OR REPLACE FUNCTION upgrade_state(
    request_id_input INT,
    user_id_input    INT,
    comment_input    TEXT DEFAULT NULL
) 
RETURNS JSON AS $$
DECLARE
    temp_state_id INT;
    new_state_name VARCHAR;
    is_complete   BOOLEAN;
BEGIN
    is_complete := false;

    -- Get the request's current state ID.
    SELECT current_state
    INTO temp_state_id
    FROM request_table
    WHERE request_id = request_id_input;

    -- Prevent advancing beyond the final state.
    IF temp_state_id > 4 THEN
        RAISE EXCEPTION 'Upgrade failed: the limit has been reached';
    ELSE
        -- Increment the state and capture the new state ID.
        UPDATE request_table
        SET current_state = current_state + 1
        WHERE request_id = request_id_input
        RETURNING current_state INTO temp_state_id;
    
        -- If the new state is the final one, mark it as complete.
        IF temp_state_id = 5 THEN
            is_complete := true;
        END IF;
    END IF;

    -- Update the previous state's record to mark it as ended.
    UPDATE state_table
    SET date_end = CURRENT_TIMESTAMP,
        completed = true,
        state_comment = comment_input,
        ended_by = user_id_input
    WHERE request_id = request_id_input
      AND state_name_id = temp_state_id - 1;

    -- Insert a new record for the current state.
    INSERT INTO state_table(state_name_id, request_id, started_by, completed)
    VALUES(temp_state_id, request_id_input, user_id_input, is_complete);

    -- Retrieve the name of the new state for the response.
    SELECT state_name
    INTO new_state_name
    FROM state_name_table
    WHERE state_name_id = temp_state_id;

    RETURN json_build_object('stateName', new_state_name, 'stateId', temp_state_id);
END;
$$ LANGUAGE plpgsql;


-- Downgrades a request to a previous state.
CREATE OR REPLACE FUNCTION degrade_state(
    request_id_input INT,
    user_id_input    INT,
    comment_input   TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    temp_state_id INT;
	new_state_name VARCHAR;
BEGIN
    -- Decrement the state only if it's in a reversible stage.
    UPDATE request_table
    SET current_state = current_state - 1
    WHERE request_id = request_id_input
      AND current_state = ANY(ARRAY[1,4])
    RETURNING current_state INTO temp_state_id;

    -- Handle rejection from the initial state.
    IF temp_state_id = 0 THEN
        UPDATE state_table
        SET state_name_id = 0,
            state_comment = 'REJECTED: ' || comment_input,
            date_end = CURRENT_TIMESTAMP,
            ended_by = user_id_input
        WHERE request_id = request_id_input
          AND state_name_id = temp_state_id + 1;

    -- Handle revision request from a later state.
    ELSIF temp_state_id = 3 THEN
        -- Reopen the previous state (state 3).
        UPDATE state_table
        SET date_end = NULL,
            completed = FALSE,
            state_comment = 'REJECTED: ' || comment_input,
            ended_by = NULL
        WHERE request_id = request_id_input
          AND state_name_id = temp_state_id;

        -- Create a "rejected" record for the state that was just left (state 4).
        UPDATE state_table
        SET state_name_id = (temp_state_id + 1) * 10 + 1, -- e.g., 4 becomes 41
            state_comment = 'REJECTED: ' || comment_input,
            date_end = CURRENT_TIMESTAMP,
            ended_by = user_id_input
        WHERE request_id = request_id_input
          AND state_name_id = temp_state_id + 1;
    ELSE
        RAISE EXCEPTION 'Degrade failed: unsupported state_id % for request_id %', temp_state_id, request_id_input;
    END IF;

	-- Get the new state name for the JSON response.
	SELECT state_name
    INTO new_state_name
    FROM state_name_table
    WHERE state_name_id = temp_state_id;

	RETURN json_build_object('stateName', new_state_name, 'stateId', temp_state_id);
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE PROCEDURE drop_request(
    request_id_input INT,
    user_id_input    INT,
    comment_input   TEXT DEFAULT NULL
) AS $$
DECLARE
    temp_state_id INT;
BEGIN

	-- Get previous temp state id
	SELECT current_state
	INTO temp_state_id
	FROM request_table
    WHERE request_id = request_id_input;

	-- set the current to 0 after getting the previous
    UPDATE request_table
    SET current_state = 0
    WHERE request_id = request_id_input;

    -- set the state to complete of the last state before rejection
	UPDATE state_table
	SET date_end = CURRENT_TIMESTAMP,
		completed = true,
		ended_by = user_id_input
	WHERE request_id = request_id_input
	  AND state_name_id = temp_state_id;

	-- set the state of rejection
    INSERT INTO state_table(state_name_id, request_id, started_by, completed, state_comment)
    VALUES(0, request_id_input, user_id_input, true, comment_input);

END;
$$ LANGUAGE plpgsql;


-- Creates a new request and its initial state, returning the new request ID.
CREATE OR REPLACE FUNCTION create_new_request(
    request_title_input          VARCHAR,
    user_id_input                INTEGER,
    requester_name_input         VARCHAR,
    analysis_purpose_input       TEXT,
    requested_completed_date_input TIMESTAMP,
    pic_submitter_input          VARCHAR,
    urgent_input                 BOOLEAN,
    requirement_type_input       INTEGER,
    answers_input                VARCHAR[],
    remark_input                 TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    temp_request_id INTEGER;
BEGIN
    -- Insert the main request details and get the generated ID.
    INSERT INTO request_table (
        request_title, user_id, requester_name, analysis_purpose,
        requested_completed_date, pic_submitter, urgent,
        requirement_type_id, remark
    )
    VALUES (
        request_title_input, user_id_input, requester_name_input, analysis_purpose_input,
        requested_completed_date_input, pic_submitter_input, urgent_input,
        requirement_type_input, remark_input
    )
    RETURNING request_id INTO temp_request_id;

    -- Set the request's initial state.
    INSERT INTO state_table(state_name_id, request_id, started_by)
    VALUES (1, temp_request_id, user_id_input);

    -- Store the associated answers using a separate procedure.
    CALL store_answers(temp_request_id, requirement_type_input, answers_input);

    RETURN temp_request_id;
END;
$$ LANGUAGE plpgsql;


-- Stores an array of answers for a given request.
CREATE OR REPLACE PROCEDURE store_answers(
    request_id_input          INT,
    requirement_type_id_input  INT,
    answer                    VARCHAR[]
)
AS $$
DECLARE
    question_num INT;
    i            INT;
BEGIN
    -- Determine how many questions need answers for this requirement type.
    SELECT COUNT(*)
    INTO question_num
    FROM requirement_question_table
    WHERE requirement_type_id = requirement_type_id_input;

    -- Loop through the answers array and insert each one.
    -- Assumes the array index corresponds to the question number.
    FOR i IN 1..question_num LOOP
        INSERT INTO requirement_table(request_id, requirement_question_id, answer)
        VALUES (request_id_input, (requirement_type_id_input * 100 + i), answer[i]);
    END LOOP;
END;
$$ LANGUAGE plpgsql;



-- Fetches all questions for a requirement type as a JSON array.
CREATE OR REPLACE FUNCTION get_questions(
    requirement_type_id_input INT
)
RETURNS JSON AS $$
DECLARE
    result_json JSON;
BEGIN
    -- Aggregate questions into a single JSON array.
    SELECT json_agg(row_to_json(t))
    INTO result_json
    FROM (
        SELECT
            requirement_question_id AS "requirementQuestionId",
            requirement_question AS "requirementQuestion"
        FROM requirement_question_table
        -- Filter questions based on a naming convention (e.g., type 1 has IDs 101-199).
        WHERE requirement_question_id BETWEEN (requirement_type_id_input * 100 + 1) AND (requirement_type_id_input * 100 + 99)
        ORDER BY requirement_question_id
    ) t;

    -- Return an empty JSON array if no results are found.
    IF result_json IS NULL THEN
        result_json := '[]'::json;
    END IF;
    RETURN result_json;
END;
$$ LANGUAGE plpgsql;


-- Inserts file paths for request attachments.
CREATE OR REPLACE PROCEDURE store_attachments(
    request_id_input     INT,
    docx_filepath        VARCHAR,
    docx_filename_input  VARCHAR,
    excel_filepath       VARCHAR,
    excel_filename_input VARCHAR
) AS $$
BEGIN
    -- Insert DOCX attachment if provided.
    IF docx_filepath IS NOT NULL AND docx_filename_input IS NOT NULL THEN
        INSERT INTO attachment_table(request_id, attachment_type_id, attachment_filename, attachment_path)
        VALUES (request_id_input, 1, docx_filename_input, docx_filepath);
    END IF;

    -- Insert Excel attachment if provided.
    IF excel_filepath IS NOT NULL AND excel_filename_input IS NOT NULL THEN
        INSERT INTO attachment_table(request_id, attachment_type_id, attachment_filename, attachment_path)
        VALUES (request_id_input, 2, excel_filename_input, excel_filepath);
    END IF;
END;
$$ LANGUAGE plpgsql;


-- Retrieves the file path for a specific attachment.
CREATE OR REPLACE FUNCTION get_attachment_filepath(
    request_id_input      INT,
    attachment_type_input INT
)
RETURNS VARCHAR AS $$
DECLARE
    result_filepath VARCHAR;
BEGIN
    SELECT attachment_path
    INTO result_filepath
    FROM attachment_table
    WHERE request_id = request_id_input
      AND attachment_type_id = attachment_type_input;
    RETURN result_filepath;
END;
$$ LANGUAGE plpgsql;


-- Fetches detailed data for requests in a specific state and date range.
CREATE OR REPLACE FUNCTION get_state_specific_data(
    state_name_id_input INT,
    start_date          TIMESTAMP,
    end_date            TIMESTAMP
)
RETURNS JSON AS $$
DECLARE
    result_json JSON;
BEGIN
    -- A negative input fetches all active requests instead of a specific state.
    IF state_name_id_input < 0 THEN
        SELECT get_state_data_for_total(start_date, end_date)
        INTO result_json;
        RETURN result_json;
    END IF;

    -- Aggregate detailed request data into a single JSON array.
    SELECT json_agg(row_to_json(t))
    INTO result_json
    FROM (
        SELECT
            r.request_id AS "requestId", 
            r.request_title AS "requestTitle", 
            r.current_state AS "currentState", 
            r.request_date AS "requestDate",
			rt.data_type_name AS "dataTypeName",
            n2.state_name AS "currentStateName", 
            u.user_name AS "userName", 
            n.state_name AS "stateName",
            n.state_name_id AS "stateNameId", 
            s.date_start AS "dateStart", 
            s.date_end AS "dateEnd", 
            u2.user_name AS "startedBy",
            u3.user_name AS "endedBy", 
            s.completed
        FROM request_table r
        JOIN state_table s ON r.request_id = s.request_id
        JOIN user_table u ON r.user_id = u.user_id
        LEFT JOIN user_table u2 ON s.started_by = u2.user_id
        LEFT JOIN user_table u3 ON s.ended_by = u3.user_id
        LEFT JOIN state_name_table n ON s.state_name_id = n.state_name_id
        LEFT JOIN state_name_table n2 ON r.current_state = n2.state_name_id
		LEFT JOIN requirement_type_table rt ON r.requirement_type_id = rt.requirement_type_id
		WHERE r.request_date BETWEEN start_date AND end_date
          AND s.state_name_id = state_name_id_input
		  AND r.current_state != 0
        ORDER BY r.current_state, r.request_id
    ) t;

	-- Return an empty JSON array if no results are found.
	IF result_json IS NULL THEN 
		result_json := '[]'::json;
	END IF;
    RETURN result_json;
END;
$$ LANGUAGE plpgsql;


-- Retrieves data for all active requests in a date range.
CREATE OR REPLACE FUNCTION get_state_data_for_total(
    start_date TIMESTAMP,
    end_date   TIMESTAMP
)
RETURNS JSON AS $$
DECLARE
    result_json JSON;
BEGIN
    -- Aggregate data for all active requests into a single JSON array.
    SELECT json_agg(row_to_json(t))
    INTO result_json
    FROM (
        SELECT
            r.request_id AS "requestId", 
            r.request_title AS "requestTitle", 
            r.current_state AS "currentState", 
            r.request_date AS "requestDate",
			rt.data_type_name AS "dataTypeName",
            n2.state_name AS "currentStateName", 
            u.user_name AS "userName", 
            n.state_name AS "stateName",
            n.state_name_id AS "stateNameId", 
            s.date_start AS "dateStart", 
            s.date_end AS "dateEnd", 
            u2.user_name AS "startedBy",
            u3.user_name AS "endedBy", 
            s.completed
        FROM request_table r
        JOIN state_table s ON r.request_id = s.request_id
        JOIN user_table u ON r.user_id = u.user_id
        LEFT JOIN user_table u2 ON s.started_by = u2.user_id
        LEFT JOIN user_table u3 ON s.ended_by = u3.user_id
        LEFT JOIN state_name_table n ON s.state_name_id = n.state_name_id
        LEFT JOIN state_name_table n2 ON r.current_state = n2.state_name_id
        LEFT JOIN requirement_type_table rt ON r.requirement_type_id = rt.requirement_type_id
		WHERE r.request_date BETWEEN start_date AND end_date
          -- This condition ensures we only get the current, active state for each request.
          AND s.state_name_id = r.current_state
          AND s.state_name_id = ANY(ARRAY[1, 2, 3, 4, 5])
        ORDER BY r.current_state, r.request_id
    ) t;

	-- Return an empty JSON array if no results are found.
	IF result_json IS NULL THEN 
		result_json := '[]'::json;
	END IF;
    RETURN result_json;
END;
$$ LANGUAGE plpgsql;


-- Fetches a summary of all requests for a specific user.
CREATE OR REPLACE FUNCTION get_user_request_data(
    user_id_input INT
)
RETURNS JSON AS $$
DECLARE
    result_json JSON;
BEGIN
    -- Aggregate request summaries into a single JSON array.
    SELECT json_agg(row_to_json(t))
    INTO result_json
    FROM (
        SELECT
            r.request_id AS "requestId", 
            r.request_title AS "requestTitle", 
            r.request_date AS "requestDate",
            rt.data_type_name AS "dataTypeName", 
            n.state_name AS "stateName", 
            n.state_name_id AS "stateNameId"
        FROM request_table r
        JOIN state_name_table n ON r.current_state = n.state_name_id
        JOIN requirement_type_table rt ON r.requirement_type_id = rt.requirement_type_id
        WHERE r.user_id = user_id_input
        ORDER BY r.request_id
    ) t;

    -- Return an empty JSON array if no results are found.
    IF result_json IS NULL THEN
		result_json := '[]'::json;
	END IF;
    RETURN result_json;
END;
$$ LANGUAGE plpgsql;


-- Retrieves the complete state transition history for a request.
CREATE OR REPLACE FUNCTION get_full_state_history(
    request_id_input INT
)
RETURNS JSON AS $$
DECLARE
    result_json JSON;
BEGIN
    -- Aggregate all historical states for the request into a JSON array.
    SELECT json_agg(row_to_json(t))
    INTO result_json
    FROM (
        SELECT
            n.state_name AS "stateName", 
            s.date_start AS "dateStart", 
            s.date_end AS "dateEnd"
        FROM state_table s
        JOIN state_name_table n ON s.state_name_id = n.state_name_id
        WHERE s.request_id = request_id_input
        ORDER BY s.state_id
    ) t;

    -- Return an empty JSON array if no results are found.
    IF result_json IS NULL THEN
		result_json := '[]'::json;
	END IF;
    RETURN result_json;
END;
$$ LANGUAGE plpgsql;


-- Fetches a "to-do" list of requests based on user role.
CREATE OR REPLACE FUNCTION get_todo_data(
    user_role_input INT
)
RETURNS JSON AS $$
DECLARE
    result_json JSON;
    viewable   INT[];
BEGIN
    -- Define which states are actionable for a given role.
    IF user_role_input = 2 THEN viewable := ARRAY[2,3,4,5];
    ELSIF user_role_input = 3 THEN viewable := ARRAY[1,2,3,4,5];
    END IF;

    -- Aggregate actionable requests into a single JSON array.
    SELECT json_agg(row_to_json(t))
    INTO result_json
    FROM (
        SELECT
            r.request_id AS "requestId", 
            r.request_title AS "requestTitle", 
            r.request_date AS "requestDate", 
            rt.requirement_type_id AS "requirementTypeId",
            rt.data_type_name AS "dataTypeName", 
            u.user_name AS "userName", 
            n.state_name_id AS "stateNameId", 
            n.state_name AS "stateName",
            s.date_start AS "dateStart", 
            s.state_comment AS "stateComment"
        FROM request_table r
        JOIN user_table u ON r.user_id = u.user_id
        JOIN state_table s ON r.request_id = s.request_id
        JOIN state_name_table n ON r.current_state = n.state_name_id
        JOIN requirement_type_table rt ON r.requirement_type_id = rt.requirement_type_id
        WHERE s.state_name_id = ANY(viewable)
          -- Ensures we only get the current, active state.
          AND s.state_name_id = r.current_state
        ORDER BY rt.requirement_type_id, s.state_name_id ASC, r.request_id
    ) t;

    -- Return an empty JSON array if no results are found.
    IF result_json IS NULL THEN
		result_json := '[]'::json;
	END IF;
    RETURN result_json;
END;
$$ LANGUAGE plpgsql;


-- Retrieves all details for a single request, bundling related items into JSON arrays.
CREATE OR REPLACE FUNCTION get_complete_data_of_request_bundle(
    request_id_input INT
)
RETURNS JSON AS $$
DECLARE
    result_json JSON;
BEGIN
    SELECT row_to_json(t)
    INTO result_json
    FROM (
        SELECT
            r.request_id AS "requestId",
            r.request_title AS "requestTitle",
            r.requester_name AS "requesterName",
            r.user_id AS "userId",
            r.analysis_purpose AS "analysisPurpose",
            r.requested_completed_date AS "requestedCompletedDate",
            r.pic_submitter AS "picSubmitter",
            r.urgent,
            r.request_date AS "requestDate",
            r.remark,
            s.state_comment AS "stateComment",
            n.state_name AS "stateName",
            t.data_type_name AS "dataTypeName",

            -- Subquery aggregates all related questions and answers into a nested JSON array.
            (
                SELECT COALESCE(json_agg(reqs), '[]'::json)
                FROM (
                    SELECT
                        re.requirement_question_id AS "requirementQuestionId",
                        q.requirement_question AS "requirementQuestion",
                        re.answer
                    FROM requirement_table re
                    JOIN requirement_question_table q ON re.requirement_question_id = q.requirement_question_id
                    WHERE re.request_id = r.request_id
                    ORDER BY re.requirement_question_id
                ) AS reqs
            ) AS "questions",

            -- Subquery aggregates all attachment filenames into a nested JSON array.
            (
                SELECT COALESCE(json_agg(files), '[]'::json)
                FROM (
                    SELECT
                        att.attachment_type_id AS "attachmentTypeId",
                        att.attachment_filename AS "attachmentFilename"
                    FROM attachment_table att
                    WHERE att.request_id = r.request_id
                ) AS files
            ) AS "filenames"

        FROM request_table r
        JOIN state_table s ON r.request_id = s.request_id AND r.current_state = s.state_name_id
        JOIN state_name_table n ON r.current_state = n.state_name_id
        JOIN requirement_type_table t ON r.requirement_type_id = t.requirement_type_id
        WHERE r.request_id = request_id_input
    ) t;

    -- If no request is found, return an empty object.
    IF result_json IS NULL THEN
        result_json := '{}'::json;
    END IF;

    RETURN result_json;
END;
$$ LANGUAGE plpgsql;

-- Fetches usernames and emails for all users in a specific role.
CREATE OR REPLACE FUNCTION get_role_emails(
    role_id_input INT
)
RETURNS JSON AS $$
DECLARE
    result_json JSON;
BEGIN
    -- Aggregate user details into a single JSON array.
    SELECT json_agg(row_to_json(t))
    INTO result_json
    FROM (
        SELECT
            u.user_name AS "userName", 
            u.email
        FROM user_role_table ur
        JOIN user_table u ON ur.user_id = u.user_id
        WHERE ur.role_id = role_id_input
    ) t;

    -- Return an empty JSON array if no results are found.
    IF result_json IS NULL THEN
		result_json := '[]'::json;
	END IF;
    RETURN result_json;
END;
$$ LANGUAGE plpgsql;


-- Retrieves username and email for a specific user.
CREATE OR REPLACE FUNCTION get_user_email(
    user_id_input INT
)
RETURNS JSON AS $$
DECLARE
    result_json JSON;
BEGIN
    -- Get user details and cast the row to a JSON object.
    SELECT row_to_json(t)
    INTO result_json
    FROM (
        SELECT
            user_name AS "userName", 
            email
        FROM user_table
        WHERE user_id = user_id_input
    ) t;

    -- Return an empty JSON object if no result is found.
    IF result_json IS NULL THEN
		result_json := '{}'::json;
	END IF;
    RETURN result_json;
END;
$$ LANGUAGE plpgsql;


-- Retrieves the time threshold in hours for each state.
CREATE OR REPLACE FUNCTION get_state_threshold()
RETURNS JSON AS $$
DECLARE
    result_json JSON;
BEGIN
    -- Aggregate state thresholds into a single JSON array.
    SELECT json_agg(row_to_json(t))
    INTO result_json
    FROM (
        SELECT 
            state_name_id AS "stateNameId",
            state_threshold_hour AS "stateThresholdHour"
        FROM state_threshold_table
    ) t;
    
    -- Return an empty JSON array if no results are found.
    IF result_json IS NULL THEN
		result_json := '[]'::json;
	END IF;
    RETURN result_json;
END;
$$ LANGUAGE plpgsql;

-- Counts active requests for each state within a date range.
CREATE OR REPLACE FUNCTION get_state_count(
    start_date TIMESTAMP,
    end_date   TIMESTAMP
)
RETURNS JSON AS $$
DECLARE
    result_json JSON;
BEGIN
    -- Aggregate state counts into a single JSON array.
    SELECT json_agg(row_to_json(t))
    INTO result_json
    FROM (
        SELECT
          r.current_state AS "stateId",
          n.state_name AS "stateName",
          COUNT(*) AS "todo"
        FROM request_table r
        JOIN state_name_table n ON r.current_state = n.state_name_id
        WHERE n.state_name_id = ANY(ARRAY[1,2,3,4,5])
          AND r.request_date BETWEEN start_date AND end_date
        -- Group by state to get the count for each one.
        GROUP BY ("stateId", n.state_name)
        ORDER BY "stateId"
    ) t;

    -- Return an empty JSON array if no results are found.
    IF result_json IS NULL THEN
		result_json := '[]'::json;
	END IF;
    RETURN result_json;
END;
$$ LANGUAGE plpgsql;


-- Finds and returns the timestamp of the oldest request.
CREATE OR REPLACE FUNCTION get_oldest_request()
RETURNS TIMESTAMP AS $$
DECLARE
    oldest_time TIMESTAMP;
BEGIN
    -- Find the earliest request_date in the table.
    SELECT request_date
    INTO oldest_time
    FROM request_table
    ORDER BY request_date ASC
    LIMIT 1;
    RETURN oldest_time;
END;
$$ LANGUAGE plpgsql;


-- Retrieves the names of all requirement types.
CREATE OR REPLACE FUNCTION get_requirement_names()
RETURNS JSON AS $$
DECLARE
    result_json JSON;
BEGIN
    -- Aggregate requirement type names into a single JSON array.
    SELECT json_agg(row_to_json(t))
    INTO result_json
    FROM (
        SELECT
            requirement_type_id AS "requirementTypeId",
            data_type_name AS "dataTypeName"
        FROM requirement_type_table
    ) t;

    -- Return an empty JSON array if no results are found.
    IF result_json IS NULL THEN
		result_json := '[]'::json;
	END IF;
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
-- TRUNCATE TABLE requirement_type_table;
-- TRUNCATE TABLE requirement_question_table;

-- INSERT MAPPING OF STATE NAME AND ID
INSERT INTO state_name_table (state_name_id, state_name)
VALUES
(0, 'REJECTED'),
(1, 'SUBMITTED'),
(2, 'VALIDATED'),
(3, 'IN PROGRESS'),
(4, 'WAITING FOR REVIEW'),
(5, 'DONE'),
(41, 'APPROVAL REJECTED');

-- INSERT ROLE DATA
INSERT INTO role_table (role_id, role_name)
VALUES 
(1, 'user'),
(2, 'worker'),
(3, 'validator')

-- INSERT DUMMY USER ROLE
INSERT INTO user_role_table (user_id, role_id) VALUES
(1, 1),
(2, 1),
(3, 1),
(4, 1),
(5, 1),
(6, 1),
(7, 2),
(8, 2),
(9, 3),
(10, 3),
(11, 3);

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

INSERT INTO user_table (user_name, user_password, user_role, email, nik, position, department) VALUES
('barta',    '1234', 1, 'barta@example.com',    1011, 'Manager',      'Finance');

-- insert dummy request

CALL create_new_request('Sales Report Q1', 1, 'alice', 'Analyze Q1 sales trends, focusing on regional performance.', '2025-01-20 17:00:00', 'alice', false, 1,
ARRAY['CRM System A', 'Last Quarter', 'Revenue per Region'], 'Initial sales overview request');
CALL create_new_request('Inventory Audit', 2, 'bob', 'Check inventory discrepancies across warehouses, needing specific new columns.', '2025-02-15 17:00:00', 'bob', true, 2,
ARRAY['Warehouse Logs', 'Item_Quantity, Bin_Location', 'LIFO Method', 'false'], 'Urgent audit, data needed by end of week');
CALL create_new_request('Customer Feedback', 3, 'carol', 'Summarize customer feedback from surveys and support tickets.', '2025-03-10 17:00:00', 'carol', false, 3,
ARRAY['User Behavior Module', 'Website Analytics DB', 'Last 30 Days', 'Clickstream Analysis', 'Product Team', 'Heatmap Report'], 'Needs to be presented at quarterly review');
CALL create_new_request('IT Upgrade', 4, 'dave', 'Plan for new hardware rollout in Q3.', '2025-03-25 17:00:00', 'dave', true, 1,
ARRAY['Network Logs', 'Current Year', 'Bandwidth Usage'], 'High priority, budget allocation pending');
CALL create_new_request('HR Survey', 5, 'eve', 'Analyze employee satisfaction scores from recent survey.', '2025-04-10 17:00:00', 'eve', false, 2,
ARRAY['Employee Records DB', 'Job_Satisfaction_Index, Turnover_Rate', 'Standard Deviation', 'true'], 'Annual survey results analysis');
CALL create_new_request('Budget Review', 6, 'frank', 'Review Q2 budget allocations and spending patterns.', '2025-04-30 17:00:00', 'frank', false, 3,
ARRAY['Expense Tracking System', 'Financial GL', 'Q2 Current', 'Cost Center Allocation', 'Accounting Department', 'Expense Summary Report'], 'Prepare for monthly finance meeting');
CALL create_new_request('Marketing Plan', 7, 'grace', 'Draft new marketing strategy for product launch.', '2025-05-15 17:00:00', 'grace', true, 1,
ARRAY['Competitor Analysis', 'Next Quarter', 'Market Penetration'], 'Launch critical, needs quick turnaround');
CALL create_new_request('Security Audit', 8, 'heidi', 'Assess system vulnerabilities and compliance.', '2025-05-28 17:00:00', 'heidi', false, 2,
ARRAY['Vulnerability Scanner', 'Scan_Result_ID, Critical_Vulnerability_Count', 'CVSS Score', 'false'], 'Annual security review');
CALL create_new_request('Supplier Evaluation', 9, 'ivan', 'Evaluate new suppliers for cost efficiency and quality.', '2025-06-11 17:00:00', 'ivan', true, 3,
ARRAY['Vendor Portal', 'Contract Database', 'All Time', 'Quality Metrics', 'Purchasing Team', 'Supplier Risk Matrix'], 'Urgent to onboard new vendors');
CALL create_new_request('Website Redesign', 10, 'judy', 'Plan new website layout and user experience improvements.', '2025-06-25 17:00:00', 'judy', false, 1,
ARRAY['A/B Test Results', 'Current Version', 'Conversion Rate'], 'Enhance user engagement');
CALL create_new_request('Inventory Audit (Q2)', 1, 'alice', 'Check inventory discrepancies for Q2 report.', '2025-02-15 17:00:00', 'alice', true, 2,
ARRAY['Physical Count Sheet', 'Damaged_Items, Expired_Goods', 'Weighted Average', 'true'], 'Follow-up audit, Q2 data');

-- SET RANDOM MONTH
-- UPDATE request_table
-- SET
--     request_date = (
--         -- Take the year from the original date
--         EXTRACT(YEAR FROM request_date) || '-' ||
--         -- Generate a random month (1-6) and format it with leading zero if needed
--         LPAD(((FLOOR(RANDOM() * 6) + 1)::TEXT), 2, '0') || '-' ||
--         -- Take the day from the original date and format it with leading zero if needed
--         LPAD(EXTRACT(DAY FROM request_date)::TEXT, 2, '0') ||
--         -- Append the time component from the original date
--         TO_CHAR(request_date, ' HH24:MI:SS.MS')
--     )::TIMESTAMP
-- WHERE
--     request_id BETWEEN 2 AND 10;

UPDATE state_table
SET date_start = request_table.request_date
FROM request_table
WHERE state_table.request_id = request_table.request_id
  AND state_table.state_name_id = 1;

-- INSERT REQUIREMENT QUESTIONS
INSERT INTO requirement_question_table(requirement_question_id, requirement_question, requirement_type_id)
VALUES
-- FRRA Questions (Type 1)
(101, 'Sumber Data Yang Digunakan ?', 1),
(102, 'Periode Data yang Digunakan ?', 1),
(103, 'Metode Perhitungan yang digunakan ?', 1),
-- Dataset (Penambahan Column) Questions (Type 2)
(201, 'Sumber Data yang digunakan ?', 2),
(202, 'Column yang akan ditambahakan ?', 2),
(203, 'Metode perhitungan yang digunakan ?', 2),
(204, 'Perlu Init Data periode sebelum nya ?', 2),
-- Dataset Baru Questions (Type 3)
(301, 'Modul apa yang akan dibuat ?', 3),
(302, 'Sumber Data Yang Digunakan ?', 3),
(303, 'Periode Data yang Digunakan ?', 3),
(304, 'Metode Perhitungan yang digunakan ?', 3),
(305, 'Siapa Pengguna Dataset ?', 3),
(306, 'Contoh report yang akan menggunakan Dataset ?', 3);

INSERT INTO requirement_type_table 
VALUES
(1,'FFRA',3),
(2,'Dataset (Penambahan Column)',4),
(3, 'Dataset baru',6)

INSERT INTO attachment_type_table 
VALUES
(1,'docx/pdf'),
(2,'excel')

INSERT INTO state_threshold_table
VALUES
(1,8),
(2,8),
(3,8),
(4,8)

-- set all name lower case
UPDATE user_table
SET user_name = LOWER(user_name);

-- Step 1: Delete from attachment_table (check spelling!)
DELETE FROM attachment_table WHERE request_id > 21;

-- Step 2: Delete from state_table
DELETE FROM state_table WHERE request_id > 21;

-- Step 3: Delete from requirement_table
DELETE FROM requirement_table WHERE request_id > 21;

DELETE FROM request_table WHERE request_id >21;


UPDATE state_name_table
SET state_name = 'REQUEST REJECTED'
WHERE state_name_id = 0;

SELECT get_user_id('alo', '1234')

INSERT INTO state_table(state_type, state_name, request_id)
VALUES(1, 'SUBMITTED', 1);


CALL upgrade_state(33, 3);

-- TEST TO GET DATA WHERE RANGE = WEEK AND STATE SUBMITTED
SELECT get_state_specific_data(1,1)

CALL upgrade_state(1,10);
CALL upgrade_state(2,10);
CALL upgrade_state(3,9);

SELECT get_complete_data_of_request(14,1)

SELECT get_user_request_data(11)

SELECT current_state, request_title FROM request_table
WHERE request_id = 13;

ALTER SEQUENCE user_data_user_id_seq RESTART WITH 0;

-- RESET SERIAL TO 1
SELECT setval(pg_get_serial_sequence('user_table', 'user_id'), COALESCE(max(user_id) + 1, 1), false)
FROM   user_table;

SELECT setval(pg_get_serial_sequence('request_table', 'request_id'), COALESCE(max(request_id) + 1, 1), false)
FROM   request_table;


SELECT setval(pg_get_serial_sequence('state_table', 'state_id'), COALESCE(max(state_id) + 1, 1), false)
FROM   state_table;

SELECT 
  docx_attachment, 
  excel_attachment 
FROM 
  request_table 
WHERE 
  request_id = 15;

-- VIEW USER_TABLE
SELECT * FROM public.user_table
ORDER BY user_id ASC 

-- VIEW REQUEST_TABLE
SELECT * FROM public.request_table
ORDER BY request_id ASC 

-- VIEW REQUIREMENT_TABLE
SELECT * FROM public.requirement_table
ORDER BY requirement_id ASC 

-- VIEW STATE_NAME_TABLE
SELECT * FROM public.state_name_table
ORDER BY state_name_id ASC

-- VIEW STATE_TABLE
SELECT * FROM public.state_table
ORDER BY state_id ASC


-- This single function replaces the three separate functions to improve performance
-- by reducing database round trips from three to one.
select get_request_details_bundle(30)

$$ LANGUAGE plpgsql;
