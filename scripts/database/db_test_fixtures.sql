INSERT INTO pipelines (id, created, modified, status, type)
OVERRIDING SYSTEM VALUE
VALUES (1, NOW(), NOW(), 'pending', 'test_pipeline');

SELECT setval('pipelines_id_seq', 1);
