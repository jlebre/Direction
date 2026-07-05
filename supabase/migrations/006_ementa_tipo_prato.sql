-- Adiciona tipo_prato à tabela ementa para suportar vários pratos por refeição
-- Linhas existentes ficam com tipo_prato = 'prato' — nenhum dado perdido.

DO $$ BEGIN
  CREATE TYPE tipo_prato_enum AS ENUM ('sopa','prato','sobremesa','extra','bebida','outro');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE ementa ADD COLUMN IF NOT EXISTS tipo_prato tipo_prato_enum NOT NULL DEFAULT 'prato';
