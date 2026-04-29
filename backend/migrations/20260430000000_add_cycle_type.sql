CREATE TYPE cycle_type AS ENUM ('weekly', 'monthly', 'quarterly', 'yearly', 'all_time');

ALTER TABLE groups
    ADD COLUMN cycle_type cycle_type NOT NULL DEFAULT 'monthly';
