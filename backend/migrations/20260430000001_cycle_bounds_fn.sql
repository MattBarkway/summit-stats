CREATE OR REPLACE FUNCTION cycle_bounds(t cycle_type)
RETURNS TABLE(start_at TIMESTAMPTZ, end_at TIMESTAMPTZ)
LANGUAGE sql STABLE AS $$
  SELECT
    CASE t
      WHEN 'weekly'    THEN date_trunc('week',    NOW())
      WHEN 'monthly'   THEN date_trunc('month',   NOW())
      WHEN 'quarterly' THEN date_trunc('quarter', NOW())
      WHEN 'yearly'    THEN date_trunc('year',    NOW())
      WHEN 'all_time'  THEN '1970-01-01'::timestamptz
    END AS start_at,
    CASE t
      WHEN 'weekly'    THEN date_trunc('week',    NOW()) + INTERVAL '7 days'
      WHEN 'monthly'   THEN date_trunc('month',   NOW()) + INTERVAL '1 month'
      WHEN 'quarterly' THEN date_trunc('quarter', NOW()) + INTERVAL '3 months'
      WHEN 'yearly'    THEN date_trunc('year',    NOW()) + INTERVAL '1 year'
      WHEN 'all_time'  THEN '9999-12-31'::timestamptz
    END AS end_at;
$$;
