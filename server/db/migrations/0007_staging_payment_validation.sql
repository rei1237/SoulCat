-- A slot is never released by cancellation: this validation permits two orders total.
ALTER TABLE orders ADD COLUMN staging_validation_run TEXT;
CREATE UNIQUE INDEX staging_payment_method_once ON orders(staging_validation_run,pay_method)
WHERE staging_validation_run IS NOT NULL;
