-- Legacy `queued` == same dispatch slot as `starting`; consolidate wording + semantics.

UPDATE jobs SET state = 'starting' WHERE state = 'queued';
