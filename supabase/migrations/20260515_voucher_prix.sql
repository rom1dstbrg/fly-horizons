-- Add prix (monetary value) to voucher_codes for manual vouchers
alter table voucher_codes add column if not exists prix numeric(8,2);
