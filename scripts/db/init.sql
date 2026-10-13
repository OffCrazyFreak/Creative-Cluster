-- One database per site, as on Neon.
CREATE DATABASE cc_dnz;
\c cc_rpcc
CREATE EXTENSION IF NOT EXISTS pg_trgm;
\c cc_dnz
CREATE EXTENSION IF NOT EXISTS pg_trgm;
