BEGIN;

DELETE FROM collection_albums ca
USING collection_albums other
WHERE ca.id <> other.id
  AND ca.collection_id = other.collection_id
  AND ca.album_id = '077f9429-7e1d-4fcf-b2eb-2863ad183be0'
  AND other.album_id = '6461a40c-9c0c-4f3b-bcdb-82d4234f7039';

UPDATE collection_albums
SET album_id = '6461a40c-9c0c-4f3b-bcdb-82d4234f7039'
WHERE album_id = '077f9429-7e1d-4fcf-b2eb-2863ad183be0';

DELETE FROM albums
WHERE id = '077f9429-7e1d-4fcf-b2eb-2863ad183be0';

COMMIT;
