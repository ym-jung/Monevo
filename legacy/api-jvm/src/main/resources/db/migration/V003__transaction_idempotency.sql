ALTER TABLE transaction
	ADD COLUMN client_request_id UUID,
	ADD COLUMN create_request_hash VARCHAR(64);

UPDATE transaction
SET client_request_id = id,
	create_request_hash = 'legacy:' || id::text
WHERE client_request_id IS NULL;

ALTER TABLE transaction
	ALTER COLUMN client_request_id SET NOT NULL,
	ALTER COLUMN create_request_hash SET NOT NULL;

CREATE UNIQUE INDEX ux_txn_creator_client_request
	ON transaction (created_by_user_id, client_request_id);
