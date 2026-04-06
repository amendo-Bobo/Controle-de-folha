const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variáveis de ambiente do Supabase não configuradas!');
    console.log('Configure SUPABASE_URL e SUPABASE_SERVICE_KEY no .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// SQL para criar as tabelas
const createTablesSQL = `
-- Tabela de Funcionários
CREATE TABLE IF NOT EXISTS funcionarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('vendedora', 'producao')),
    salario_base DECIMAL(10,2) DEFAULT 0,
    comissao_maquina_grande DECIMAL(10,2) DEFAULT 550,
    comissao_maquina_pequena DECIMAL(10,2) DEFAULT 350,
    meta_maquinas INTEGER DEFAULT 10,
    bonus_meta DECIMAL(10,2) DEFAULT 2000,
    comissao_producao DECIMAL(10,2) DEFAULT 100,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Vendas
CREATE TABLE IF NOT EXISTS vendas (
    id SERIAL PRIMARY KEY,
    id_funcionario INTEGER NOT NULL REFERENCES funcionarios(id),
    data_venda DATE NOT NULL,
    quantidade_maquinas INTEGER NOT NULL,
    tipo_maquina VARCHAR(50) NOT NULL CHECK (tipo_maquina IN ('grande', 'pequena')),
    com_desconto BOOLEAN DEFAULT false,
    valor_unitario DECIMAL(10,2) NOT NULL,
    valor_total DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Produção
CREATE TABLE IF NOT EXISTS producao (
    id SERIAL PRIMARY KEY,
    id_funcionario INTEGER NOT NULL REFERENCES funcionarios(id),
    data_producao DATE NOT NULL,
    maquinas_produzidas INTEGER NOT NULL,
    valor_comissao DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Folha de Pagamento
CREATE TABLE IF NOT EXISTS folha_pagamento (
    id SERIAL PRIMARY KEY,
    id_funcionario INTEGER NOT NULL REFERENCES funcionarios(id),
    mes_referencia VARCHAR(7) NOT NULL, -- Formato: YYYY-MM
    salario_base DECIMAL(10,2) DEFAULT 0,
    comissoes DECIMAL(10,2) DEFAULT 0,
    bonus DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    detalhe_comissoes TEXT, -- JSON com detalhes das comissões
    tipo VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_funcionario, mes_referencia)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_funcionarios_tipo ON funcionarios(tipo);
CREATE INDEX IF NOT EXISTS idx_funcionarios_ativo ON funcionarios(ativo);
CREATE INDEX IF NOT EXISTS idx_vendas_data ON vendas(data_venda);
CREATE INDEX IF NOT EXISTS idx_vendas_funcionario ON vendas(id_funcionario);
CREATE INDEX IF NOT EXISTS idx_producao_data ON producao(data_producao);
CREATE INDEX IF NOT EXISTS idx_producao_funcionario ON producao(id_funcionario);
CREATE INDEX IF NOT EXISTS idx_folha_mes ON folha_pagamento(mes_referencia);
CREATE INDEX IF NOT EXISTS idx_folha_funcionario ON folha_pagamento(id_funcionario);

-- Functions para atualizar timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar timestamps
CREATE TRIGGER update_funcionarios_updated_at BEFORE UPDATE ON funcionarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendas_updated_at BEFORE UPDATE ON vendas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_producao_updated_at BEFORE UPDATE ON producao
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_folha_pagamento_updated_at BEFORE UPDATE ON folha_pagamento
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;

// Função para executar a migração
async function migrateToSupabase() {
    try {
        console.log('🚀 Iniciando migração para Supabase...');
        
        // Executar SQL de criação de tabelas
        const { data, error } = await supabase.rpc('exec_sql', { sql: createTablesSQL });
        
        if (error) {
            console.error('❌ Erro ao criar tabelas:', error);
            throw error;
        }
        
        console.log('✅ Tabelas criadas com sucesso!');
        
        // Inserir dados de exemplo (opcional)
        await insertSampleData();
        
        console.log('🎉 Migração concluída com sucesso!');
        console.log('📊 Banco de dados pronto para uso no Supabase!');
        
    } catch (error) {
        console.error('❌ Erro na migração:', error);
        process.exit(1);
    }
}

// Função para inserir dados de exemplo
async function insertSampleData() {
    try {
        console.log('📝 Inserindo dados de exemplo...');
        
        // Inserir funcionários de exemplo
        const { data: funcionarios, error: errorFunc } = await supabase
            .from('funcionarios')
            .upsert([
                {
                    nome: 'Kelly Silva',
                    tipo: 'vendedora',
                    salario_base: 0,
                    comissao_maquina_grande: 550,
                    comissao_maquina_pequena: 350,
                    meta_maquinas: 10,
                    bonus_meta: 2000
                },
                {
                    nome: 'João Santos',
                    tipo: 'producao',
                    salario_base: 3000,
                    comissao_producao: 100
                }
            ])
            .select();
        
        if (errorFunc) {
            console.error('❌ Erro ao inserir funcionários:', errorFunc);
            return;
        }
        
        console.log('✅ Funcionários de exemplo inseridos!');
        
    } catch (error) {
        console.error('❌ Erro ao inserir dados de exemplo:', error);
    }
}

// Executar migração
if (require.main === module) {
    migrateToSupabase();
}

module.exports = { migrateToSupabase };
