const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Importar Supabase
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('Iniciando servidor...');

// Configurar Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://db.yuwddqxdnyjvilbmjooc.supabase.co';
const supabaseKey = process.env.SUPABASE_PASSWORD || 'tiVW2cmpeVStByLm';

// Forçar IPv4 para evitar ENETUNREACH
const supabase = createClient(supabaseUrl, supabaseKey, {
    db: {
        schema: 'public'
    },
    auth: {
        persistSession: false,
        autoRefreshToken: false
    },
    global: {
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    }
});

// Verificar se está usando Supabase
const databaseUrl = process.env.DATABASE_URL;
const useSupabase = databaseUrl && databaseUrl.includes('supabase');

console.log('DATABASE_URL:', databaseUrl ? 'Configurada' : 'Não configurada');
console.log('Usando Supabase:', useSupabase);

// Função para criar tabelas no Supabase (só se usar)
async function createSupabaseTables() {
    if (!useSupabase) {
        console.log('Não está usando Supabase, pulando criação de tabelas');
        return;
    }
    
    console.log('Tentando criar tabelas no Supabase...');
    
    const { Client } = require('pg');
    
    try {
        // Usar o endpoint correto do pooler
        const poolerUrl = databaseUrl.replace(
            'postgresql://postgres:tiVW2cmpeVStByLm@db.yuwddqxdnyjvilbmjooc.supabase.co:5432/postgres',
            'postgresql://postgres.yuwddqxdnyjvilbmjooc:tiVW2cmpeVStByLm@aws-1-sa-east-1.pooler.supabase.com:6543/postgres'
        );
        
        console.log('Tentando conectar com:', poolerUrl.split('@')[1]);
        
        const client = new Client({
            connectionString: poolerUrl,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 10000,
            query_timeout: 10000
        });
        
        try {
            await client.connect();
            console.log('Conectado ao PostgreSQL com pooler!');
            
            // Criar tabela funcionarios
            await client.query(`
                CREATE TABLE IF NOT EXISTS funcionarios (
                    id BIGSERIAL PRIMARY KEY,
                    nome TEXT NOT NULL,
                    tipo TEXT NOT NULL CHECK(tipo IN ('vendedora', 'producao', 'administrativo')),
                    comissao_maquina_grande REAL DEFAULT 450,
                    comissao_maquina_pequena REAL DEFAULT 250,
                    comissao_extra_desconto REAL DEFAULT 100,
                    salario_base REAL DEFAULT 0,
                    comissao_maquina_producao REAL DEFAULT 100,
                    meta_maquinas INTEGER DEFAULT 10,
                    premio_meta REAL DEFAULT 1000,
                    bonus_meta REAL DEFAULT 1000,
                    dia_15_percent REAL DEFAULT 50,
                    dia_30_percent REAL DEFAULT 50,
                    ativo BOOLEAN DEFAULT true
                )
            `);
            
            // Adicionar coluna premio_meta se não existir
            try {
                await client.query(`ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS premio_meta REAL DEFAULT 1000`);
                console.log('Coluna premio_meta adicionada (se não existia)');
            } catch (error) {
                console.log('Coluna premio_meta já existe ou erro ao adicionar:', error.message);
            }
            
            // Adicionar colunas de quinzena se não existirem
            try {
                await client.query(`ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS dia_15_percent REAL DEFAULT 50`);
                console.log('Coluna dia_15_percent adicionada (se não existia)');
            } catch (error) {
                console.log('Coluna dia_15_percent já existe ou erro ao adicionar:', error.message);
            }
            
            try {
                await client.query(`ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS dia_30_percent REAL DEFAULT 50`);
                console.log('Coluna dia_30_percent adicionada (se não existia)');
            } catch (error) {
                console.log('Coluna dia_30_percent já existe ou erro ao adicionar:', error.message);
            }
            
            // Criar tabela vendas
            await client.query(`
                CREATE TABLE IF NOT EXISTS vendas (
                    id BIGSERIAL PRIMARY KEY,
                    id_funcionario BIGINT NOT NULL REFERENCES funcionarios(id),
                    tipo_maquina TEXT NOT NULL CHECK(tipo_maquina IN ('grande', 'pequena')),
                    quantidade_maquinas INTEGER NOT NULL,
                    com_desconto BOOLEAN DEFAULT false,
                    data_venda DATE NOT NULL,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            `);
            
            // Remover constraint antiga e adicionar nova (se necessário)
            try {
                await client.query(`
                    ALTER TABLE vendas DROP CONSTRAINT IF EXISTS vendas_tipo_maquina_check
                `);
                console.log('Constraint antiga removida');
            } catch (error) {
                console.log('Constraint não existe ou erro ao remover:', error.message);
            }
            
            // Adicionar constraint correta
            try {
                await client.query(`
                    ALTER TABLE vendas ADD CONSTRAINT vendas_tipo_maquina_check 
                    CHECK (tipo_maquina IN ('grande', 'pequena'))
                `);
                console.log('Constraint correta adicionada');
            } catch (error) {
                console.log('Constraint já existe ou erro ao adicionar:', error.message);
            }
            
            // Criar tabela producao
            await client.query(`
                CREATE TABLE IF NOT EXISTS producao (
                    id BIGSERIAL PRIMARY KEY,
                    id_funcionario BIGINT NOT NULL REFERENCES funcionarios(id),
                    maquinas_produzidas INTEGER NOT NULL,
                    data_producao DATE NOT NULL,
                    quinzena TEXT DEFAULT 'dia_30',
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            `);
            console.log('Tabela producao criada com sucesso');
            
            // Adicionar coluna quinzena se não existir
            try {
                await client.query(`ALTER TABLE producao ADD COLUMN IF NOT EXISTS quinzena TEXT DEFAULT 'dia_30'`);
                console.log('Coluna quinzena adicionada (se não existia)');
            } catch (error) {
                console.log('Coluna quinzena já existe ou erro ao adicionar:', error.message);
            }
            
            // Criar tabela folha_pagamento
            try {
                // Tentar dropar a tabela existente para recriar com estrutura correta
                await client.query(`DROP TABLE IF EXISTS folha_pagamento CASCADE`);
                console.log('Tabela folha_pagamento antiga removida');
            } catch (dropError) {
                console.log('Tabela não existe ou erro ao remover:', dropError.message);
            }
            
            // Recriar com estrutura correta
            await client.query(`
                CREATE TABLE folha_pagamento (
                    id BIGSERIAL PRIMARY KEY,
                    id_funcionario BIGINT NOT NULL REFERENCES funcionarios(id),
                    mes_referencia TEXT NOT NULL,
                    quinzena TEXT NOT NULL DEFAULT 'mensal',
                    salario_base REAL NOT NULL DEFAULT 0,
                    comissoes REAL NOT NULL DEFAULT 0,
                    bonus REAL NOT NULL DEFAULT 0,
                    vales REAL NOT NULL DEFAULT 0,
                    outros_descontos REAL NOT NULL DEFAULT 0,
                    total REAL NOT NULL DEFAULT 0,
                    data_geracao DATE DEFAULT CURRENT_DATE NOT NULL,
                    detalhe_comissoes TEXT,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            `);
            console.log('Tabela folha_pagamento recriada com estrutura correta');
            
            // Criar tabela vales
            try {
                await client.query(`DROP TABLE IF EXISTS vales CASCADE`);
                console.log('Tabela vales antiga removida');
            } catch (dropError) {
                console.log('Tabela vales não existe ou erro ao remover:', dropError.message);
            }
            
            await client.query(`
                CREATE TABLE vales (
                    id BIGSERIAL PRIMARY KEY,
                    id_funcionario BIGINT NOT NULL REFERENCES funcionarios(id),
                    motivo TEXT NOT NULL,
                    valor REAL NOT NULL,
                    observacao TEXT,
                    quinzena TEXT NOT NULL,
                    mes_referencia TEXT NOT NULL,
                    data_lancamento DATE DEFAULT CURRENT_DATE NOT NULL,
                    status TEXT NOT NULL DEFAULT 'pendente',
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            `);
            console.log('Tabela vales criada com sucesso');
            
            // Adicionar colunas de descontos e quinzena se não existirem
            try {
                await client.query(`ALTER TABLE folha_pagamento ADD COLUMN quinzena TEXT DEFAULT 'mensal'`);
                console.log('Coluna quinzena adicionada (se não existia)');
            } catch (error) {
                console.log('Coluna quinzena já existe ou erro ao adicionar:', error.message);
            }
            
            try {
                await client.query(`ALTER TABLE folha_pagamento ADD COLUMN vales REAL DEFAULT 0`);
                console.log('Coluna vales adicionada (se não existia)');
            } catch (error) {
                console.log('Coluna vales já existe ou erro ao adicionar:', error.message);
            }
            
            try {
                await client.query(`ALTER TABLE folha_pagamento ADD COLUMN outros_descontos REAL DEFAULT 0`);
                console.log('Coluna outros_descontos adicionada (se não existia)');
            } catch (error) {
                console.log('Coluna outros_descontos já existe ou erro ao adicionar:', error.message);
            }
            
        } catch (connError) {
            console.log('Erro na conexão (timeout):', connError.message);
            throw connError;
        }
        
        console.log('Tabelas criadas com sucesso no Supabase!');
        await client.end();
        
    } catch (error) {
        console.log('Erro ao configurar Supabase:', error.message);
        console.log('Detalhes do erro:', error);
    }
}

// Middleware
app.use(cors());
app.use(express.json());

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Conectar ao banco de dados SQLite
console.log('Conectando ao banco de dados...');
const db = new sqlite3.Database('./erp.db', (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco:', err.message);
        process.exit(1);
    }
    console.log('Banco de dados conectado com sucesso');
    
    db.serialize(() => {
        console.log('Criando tabelas no banco de dados...');
        
        // Tabela funcionarios
        db.run(`CREATE TABLE IF NOT EXISTS funcionarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            tipo TEXT NOT NULL CHECK(tipo IN ('vendedora', 'producao', 'administrativo')),
            comissao_maquina_grande REAL DEFAULT 450,
            comissao_maquina_pequena REAL DEFAULT 250,
            comissao_extra_desconto REAL DEFAULT 100,
            salario_base REAL DEFAULT 0,
            comissao_maquina_producao REAL DEFAULT 100,
            meta_maquinas INTEGER DEFAULT 10,
            premio_meta REAL DEFAULT 1000,
            bonus_meta REAL DEFAULT 1000,
            dia_15_percent REAL DEFAULT 50,
            dia_30_percent REAL DEFAULT 50,
            ativo BOOLEAN DEFAULT 1
        )`);
        
        console.log('Tabela funcionarios criada com sucesso');
        
        // Adicionar coluna premio_meta se não existir
        db.run(`ALTER TABLE funcionarios ADD COLUMN premio_meta REAL DEFAULT 1000`, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.log('Coluna premio_meta já existe ou erro ao adicionar:', err.message);
            } else if (!err) {
                console.log('Coluna premio_meta adicionada (se não existia)');
            }
        });
        
        // Adicionar colunas de quinzena se não existirem
        db.run(`ALTER TABLE funcionarios ADD COLUMN dia_15_percent REAL DEFAULT 50`, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.log('Coluna dia_15_percent já existe ou erro ao adicionar:', err.message);
            } else if (!err) {
                console.log('Coluna dia_15_percent adicionada (se não existia)');
            }
        });
        
        db.run(`ALTER TABLE funcionarios ADD COLUMN dia_30_percent REAL DEFAULT 50`, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.log('Coluna dia_30_percent já existe ou erro ao adicionar:', err.message);
            } else if (!err) {
                console.log('Coluna dia_30_percent adicionada (se não existia)');
            }
        });

        // Tabela vendas
        db.run(`CREATE TABLE IF NOT EXISTS vendas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_funcionario INTEGER NOT NULL,
            tipo_maquina TEXT NOT NULL CHECK(tipo_maquina IN ('grande', 'pequena')),
            quantidade_maquinas INTEGER NOT NULL,
            com_desconto BOOLEAN DEFAULT 1,
            data_venda DATE NOT NULL,
            FOREIGN KEY (id_funcionario) REFERENCES funcionarios(id)
        )`);
        
        console.log('Tabela vendas criada com sucesso');

        // Tabela producao
        db.run(`CREATE TABLE IF NOT EXISTS producao (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_funcionario INTEGER NOT NULL,
            maquinas_produzidas INTEGER NOT NULL,
            data_producao DATE NOT NULL,
            quinzena TEXT DEFAULT 'dia_30',
            FOREIGN KEY (id_funcionario) REFERENCES funcionarios(id)
        )`);

        // Tabela folha_pagamento
        db.run(`CREATE TABLE IF NOT EXISTS folha_pagamento (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_funcionario INTEGER NOT NULL,
            mes_referencia TEXT NOT NULL,
            quinzena TEXT NOT NULL DEFAULT 'mensal',
            salario_base REAL NOT NULL,
            comissoes REAL NOT NULL,
            bonus REAL NOT NULL,
            vales REAL NOT NULL DEFAULT 0,
            outros_descontos REAL NOT NULL DEFAULT 0,
            total REAL NOT NULL,
            data_geracao DATE NOT NULL,
            detalhe_comissoes TEXT,
            FOREIGN KEY (id_funcionario) REFERENCES funcionarios(id)
        )`);

        // Tabela vales
        db.run(`CREATE TABLE IF NOT EXISTS vales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_funcionario INTEGER NOT NULL,
            motivo TEXT NOT NULL,
            valor REAL NOT NULL,
            observacao TEXT,
            quinzena TEXT NOT NULL,
            mes_referencia TEXT NOT NULL,
            data_lancamento DATE NOT NULL,
            status TEXT NOT NULL DEFAULT 'pendente',
            FOREIGN KEY (id_funcionario) REFERENCES funcionarios(id)
        )`);

        // Adicionar coluna detalhe_comissoes se não existir
        db.run(`ALTER TABLE folha_pagamento ADD COLUMN detalhe_comissoes TEXT`, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.log('Coluna detalhe_comissoes já existe ou erro:', err.message);
            }
        });
        
        // Adicionar colunas de descontos e quinzena se não existirem
        db.run(`ALTER TABLE folha_pagamento ADD COLUMN quinzena TEXT DEFAULT 'mensal'`, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.log('Coluna quinzena já existe ou erro:', err.message);
            }
        });
        
        db.run(`ALTER TABLE folha_pagamento ADD COLUMN vales REAL DEFAULT 0`, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.log('Coluna vales já existe ou erro:', err.message);
            }
        });
        
        db.run(`ALTER TABLE folha_pagamento ADD COLUMN outros_descontos REAL DEFAULT 0`, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.log('Coluna outros_descontos já existe ou erro:', err.message);
            }
        });

        console.log('Todas as tabelas criadas com sucesso!');
    });
});

// GET vales
app.get('/api/vales', async (req, res) => {
    console.log('=== GET /api/vales chamado ===');
    console.log('useSupabase:', useSupabase);
    
    if (useSupabase) {
        // Usar PostgreSQL direto
        console.log('Buscando vales no PostgreSQL...');
        const { Client } = require('pg');
        
        try {
            const poolerUrl = databaseUrl.replace(
                'postgresql://postgres:tiVW2cmpeVStByLm@db.yuwddqxdnyjvilbmjooc.supabase.co:5432/postgres',
                'postgresql://postgres.yuwddqxdnyjvilbmjooc:tiVW2cmpeVStByLm@aws-1-sa-east-1.pooler.supabase.com:6543/postgres'
            );
            
            const client = new Client({
                connectionString: poolerUrl,
                ssl: { rejectUnauthorized: false },
                connectionTimeoutMillis: 10000,
                query_timeout: 10000
            });
            
            await client.connect();
            
            const result = await client.query(`
                SELECT v.*, f.nome as nome_funcionario 
                FROM vales v 
                JOIN funcionarios f ON v.id_funcionario = f.id 
                ORDER BY v.data_lancamento DESC
            `);
            
            console.log('Vales encontrados no PostgreSQL:', result.rows.length);
            await client.end();
            res.json(result.rows);
            
        } catch (pgError) {
            console.log('PostgreSQL falhou, usando SQLite fallback:', pgError.message);
            
            // Fallback para SQLite
            db.all(`
                SELECT v.*, f.nome as nome_funcionario 
                FROM vales v 
                JOIN funcionarios f ON v.id_funcionario = f.id 
                ORDER BY v.data_lancamento DESC
            `, [], (err, rows) => {
                if (err) {
                    console.error('Erro no SQLite local:', err);
                    res.status(500).json({ error: err.message });
                    return;
                }
                console.log('Vales encontrados no SQLite local:', rows?.length || 0);
                res.json(rows || []);
            });
        }
    } else {
        // Usar SQLite local
        db.all(`
            SELECT v.*, f.nome as nome_funcionario 
            FROM vales v 
            JOIN funcionarios f ON v.id_funcionario = f.id 
            ORDER BY v.data_lancamento DESC
        `, [], (err, rows) => {
            if (err) {
                console.error('Erro no SQLite local:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            console.log('Vales encontrados no SQLite local:', rows?.length || 0);
            res.json(rows || []);
        });
    }
});

// POST vales
app.post('/api/vales', async (req, res) => {
    console.log('=== POST /api/vales ===');
    console.log('Dados recebidos:', req.body);
    
    try {
        const { id_funcionario, motivo, valor, observacao, quinzena, mes_referencia } = req.body;
        
        // Validação básica
        if (!id_funcionario || !motivo || !valor || !quinzena || !mes_referencia) {
            console.log('Erro: Campos obrigatórios faltando');
            return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
        }
        
        if (useSupabase) {
            // Usar PostgreSQL direto
            console.log('Inserindo vale no PostgreSQL...');
            const { Client } = require('pg');
            
            try {
                const poolerUrl = databaseUrl.replace(
                    'postgresql://postgres:tiVW2cmpeVStByLm@db.yuwddqxdnyjvilbmjooc.supabase.co:5432/postgres',
                    'postgresql://postgres.yuwddqxdnyjvilbmjooc:tiVW2cmpeVStByLm@aws-1-sa-east-1.pooler.supabase.com:6543/postgres'
                );
                
                const client = new Client({
                    connectionString: poolerUrl,
                    ssl: { rejectUnauthorized: false },
                    connectionTimeoutMillis: 10000,
                    query_timeout: 10000
                });
                
                await client.connect();
                
                // Verificar se funcionário existe e está ativo
                const funcResult = await client.query('SELECT id, nome, ativo FROM funcionarios WHERE id = $1', [id_funcionario]);
                
                if (funcResult.rows.length === 0) {
                    console.error('Funcionário não encontrado:', id_funcionario);
                    await client.end();
                    return res.status(400).json({ error: 'Funcionário não encontrado' });
                }
                
                if (!funcResult.rows[0].ativo) {
                    console.error('Funcionário está inativo:', id_funcionario);
                    await client.end();
                    return res.status(400).json({ error: 'Funcionário está inativo' });
                }
                
                // Inserir vale
                const result = await client.query(
                    `INSERT INTO vales (id_funcionario, motivo, valor, observacao, quinzena, mes_referencia, data_lancamento, status) 
                     VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, 'pendente') RETURNING *`,
                    [id_funcionario, motivo, valor, observacao || null, quinzena, mes_referencia]
                );
                
                console.log('Vale inserido no PostgreSQL:', result.rows[0]);
                await client.end();
                
                // Adicionar nome do funcionário na resposta
                const valeResponse = {
                    ...result.rows[0],
                    nome_funcionario: funcResult.rows[0].nome
                };
                
                res.json(valeResponse);
                
            } catch (pgError) {
                console.log('PostgreSQL falhou, usando SQLite fallback:', pgError.message);
                
                // Fallback para SQLite
                db.get('SELECT id, nome, ativo FROM funcionarios WHERE id = ?', [id_funcionario], (err, row) => {
                    if (err) {
                        console.error('Erro ao verificar funcionário:', err);
                        return res.status(500).json({ error: err.message });
                    }
                    
                    if (!row) {
                        console.error('Funcionário não encontrado:', id_funcionario);
                        return res.status(400).json({ error: 'Funcionário não encontrado' });
                    }
                    
                    if (!row.ativo) {
                        console.error('Funcionário está inativo:', id_funcionario);
                        return res.status(400).json({ error: 'Funcionário está inativo' });
                    }
                    
                    // Inserir vale
                    const sql = 'INSERT INTO vales (id_funcionario, motivo, valor, observacao, quinzena, mes_referencia, data_lancamento, status) VALUES (?, ?, ?, ?, ?, ?, CURRENT_DATE, "pendente")';
                    const params = [id_funcionario, motivo, valor, observacao || null, quinzena, mes_referencia];
                    
                    db.run(sql, params, function(err) {
                        if (err) {
                            console.error('Erro ao inserir vale:', err);
                            return res.status(500).json({ error: err.message });
                        }
                        console.log('Vale inserido com ID:', this.lastID);
                        res.json({ 
                            id: this.lastID, 
                            id_funcionario, 
                            motivo, 
                            valor, 
                            observacao: observacao || null,
                            quinzena,
                            mes_referencia,
                            data_lancamento: new Date().toISOString().split('T')[0],
                            status: 'pendente',
                            nome_funcionario: row.nome
                        });
                    });
                });
            }
        } else {
            // Usar SQLite local
            db.get('SELECT id, nome, ativo FROM funcionarios WHERE id = ?', [id_funcionario], (err, row) => {
                if (err) {
                    console.error('Erro ao verificar funcionário:', err);
                    return res.status(500).json({ error: err.message });
                }
                
                if (!row) {
                    console.error('Funcionário não encontrado:', id_funcionario);
                    return res.status(400).json({ error: 'Funcionário não encontrado' });
                }
                
                if (!row.ativo) {
                    console.error('Funcionário está inativo:', id_funcionario);
                    return res.status(400).json({ error: 'Funcionário está inativo' });
                }
                
                // Inserir vale
                const sql = 'INSERT INTO vales (id_funcionario, motivo, valor, observacao, quinzena, mes_referencia, data_lancamento, status) VALUES (?, ?, ?, ?, ?, ?, CURRENT_DATE, "pendente")';
                const params = [id_funcionario, motivo, valor, observacao || null, quinzena, mes_referencia];
                
                db.run(sql, params, function(err) {
                    if (err) {
                        console.error('Erro ao inserir vale:', err);
                        return res.status(500).json({ error: err.message });
                    }
                    console.log('Vale inserido com ID:', this.lastID);
                    res.json({ 
                        id: this.lastID, 
                        id_funcionario, 
                        motivo, 
                        valor, 
                        observacao: observacao || null,
                        quinzena,
                        mes_referencia,
                        data_lancamento: new Date().toISOString().split('T')[0],
                        status: 'pendente',
                        nome_funcionario: row.nome
                    });
                });
            });
        }
    } catch (error) {
        console.error('Erro geral:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET funcionarios
app.get('/api/funcionarios', async (req, res) => {
    console.log('=== GET /api/funcionarios chamado ===');
    console.log('useSupabase:', useSupabase);
    
    if (useSupabase) {
        // Usar PostgreSQL direto
        console.log('Buscando funcionários no PostgreSQL...');
        const { Client } = require('pg');
        
        try {
            // Usar o endpoint correto do pooler
            const poolerUrl = databaseUrl.replace(
                'postgresql://postgres:tiVW2cmpeVStByLm@db.yuwddqxdnyjvilbmjooc.supabase.co:5432/postgres',
                'postgresql://postgres.yuwddqxdnyjvilbmjooc:tiVW2cmpeVStByLm@aws-1-sa-east-1.pooler.supabase.com:6543/postgres'
            );
            
            const client = new Client({
                connectionString: poolerUrl,
                ssl: { rejectUnauthorized: false },
                connectionTimeoutMillis: 10000,
                query_timeout: 10000
            });
            
            await client.connect();
            
            const result = await client.query('SELECT * FROM funcionarios WHERE ativo = true ORDER BY created_at DESC');
            
            console.log('Funcionários encontrados no PostgreSQL:', result.rows.length);
            console.log('Dados:', result.rows);
            
            await client.end();
            
            res.json(result.rows);
            
        } catch (error) {
            console.log('Erro no PostgreSQL, usando SQLite fallback:', error.message);
            
            // Fallback para SQLite
            db.all('SELECT * FROM funcionarios WHERE ativo = 1', (err, rows) => {
                if (err) {
                    console.error('Erro no SQLite fallback:', err);
                    return res.status(500).json({ error: err.message });
                }
                console.log('Funcionários encontrados no SQLite fallback:', rows?.length || 0);
                console.log('Dados SQLite:', rows);
                res.json(rows);
            });
        }
    } else {
        // Usar SQLite local
        console.log('Usando SQLite local...');
        db.all('SELECT * FROM funcionarios WHERE ativo = 1', (err, rows) => {
            if (err) {
                console.error('Erro no SQLite local:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            console.log('Funcionários encontrados no SQLite local:', rows?.length || 0);
            console.log('Dados SQLite local:', rows);
            res.json(rows);
        });
    }
});

// GET funcionarios/:id (buscar um funcionário específico)
app.get('/api/funcionarios/:id', async (req, res) => {
    console.log('=== GET /api/funcionarios/:id chamado ===');
    console.log('ID:', req.params.id);
    console.log('useSupabase:', useSupabase);
    
    const { id } = req.params;
    
    if (useSupabase) {
        // Usar PostgreSQL direto
        console.log('Buscando funcionário no PostgreSQL...');
        const { Client } = require('pg');
        
        try {
            // Usar o endpoint correto do pooler
            const poolerUrl = databaseUrl.replace(
                'postgresql://postgres:tiVW2cmpeVStByLm@db.yuwddqxdnyjvilbmjooc.supabase.co:5432/postgres',
                'postgresql://postgres.yuwddqxdnyjvilbmjooc:tiVW2cmpeVStByLm@aws-1-sa-east-1.pooler.supabase.com:6543/postgres'
            );
            
            const client = new Client({
                connectionString: poolerUrl,
                ssl: { rejectUnauthorized: false },
                connectionTimeoutMillis: 10000,
                query_timeout: 10000
            });
            
            await client.connect();
            console.log('Conectado ao PostgreSQL com pooler!');
            
            const result = await client.query(
                'SELECT * FROM funcionarios WHERE id = $1',
                [id]
            );
            
            await client.end();
            
            if (result.rows.length === 0) {
                console.log('Funcionário não encontrado no PostgreSQL');
                return res.status(404).json({ error: 'Funcionário não encontrado' });
            }
            
            console.log('Funcionário encontrado no PostgreSQL:', result.rows[0]);
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Erro ao buscar funcionário no PostgreSQL:', error);
            res.status(500).json({ error: error.message });
        }
    } else {
        // Usar SQLite local
        console.log('Buscando funcionário no SQLite local...');
        db.get('SELECT * FROM funcionarios WHERE id = ?', [id], (err, row) => {
            if (err) {
                console.error('Erro no SQLite local:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            if (!row) {
                console.log('Funcionário não encontrado no SQLite local');
                return res.status(404).json({ error: 'Funcionário não encontrado' });
            }
            console.log('Funcionário encontrado no SQLite local:', row);
            res.json(row);
        });
    }
});

// POST funcionarios
app.post('/api/funcionarios', async (req, res) => {
    console.log('=== POST /api/funcionarios ===');
    console.log('Dados recebidos:', req.body);
    
    try {
        const { 
            nome, 
            tipo, 
            comissao_maquina_grande, 
            comissao_maquina_pequena, 
            comissao_extra_desconto,
            salario_base, 
            comissao_maquina_producao,
            meta_maquinas,
            premio_meta,
            bonus_meta,
            dia_15_percent,
            dia_30_percent
        } = req.body;
        
        // Validação básica
        if (!nome || !tipo) {
            console.log('Erro: Campos obrigatórios faltando');
            return res.status(400).json({ error: 'Nome e tipo são obrigatórios' });
        }
        
        if (useSupabase) {
            // Usar PostgreSQL direto
            console.log('Inserindo funcionário no PostgreSQL...');
            const { Client } = require('pg');
            
            try {
                // Usar o endpoint correto do pooler
                const poolerUrl = databaseUrl.replace(
                    'postgresql://postgres:tiVW2cmpeVStByLm@db.yuwddqxdnyjvilbmjooc.supabase.co:5432/postgres',
                    'postgresql://postgres.yuwddqxdnyjvilbmjooc:tiVW2cmpeVStByLm@aws-1-sa-east-1.pooler.supabase.com:6543/postgres'
                );
                
                const client = new Client({
                    connectionString: poolerUrl,
                    ssl: { rejectUnauthorized: false },
                    connectionTimeoutMillis: 10000,
                    query_timeout: 10000
                });
                
                await client.connect();
                
                const result = await client.query(
                    `INSERT INTO funcionarios (nome, tipo, comissao_maquina_grande, comissao_maquina_pequena, 
                     comissao_extra_desconto, salario_base, comissao_maquina_producao, meta_maquinas, premio_meta, bonus_meta, dia_15_percent, dia_30_percent, ativo) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true) 
                     RETURNING *`,
                    [
                        nome, 
                        tipo, 
                        Number(comissao_maquina_grande) || 450, 
                        Number(comissao_maquina_pequena) || 250, 
                        Number(comissao_extra_desconto) || 100,
                        Number(salario_base) || 0, 
                        Number(comissao_maquina_producao) || 100,
                        Number(meta_maquinas) || 10,
                        Number(premio_meta) || 1000,
                        Number(bonus_meta) || 1000,
                        Number(dia_15_percent) || 50,
                        Number(dia_30_percent) || 50
                    ]
                );
                
                console.log('Funcionário inserido no PostgreSQL:', result.rows[0]);
                
                await client.end();
                
                res.json(result.rows[0]);
            } catch (pgError) {
                console.log('PostgreSQL falhou, usando SQLite fallback:', pgError.message);
                
                // Fallback para SQLite
                const sql = 'INSERT INTO funcionarios (nome, tipo, comissao_maquina_grande, comissao_maquina_pequena, comissao_extra_desconto, salario_base, comissao_maquina_producao, meta_maquinas, premio_meta, bonus_meta, dia_15_percent, dia_30_percent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
                const params = [
                    nome, 
                    tipo, 
                    Number(comissao_maquina_grande) || 450, 
                    Number(comissao_maquina_pequena) || 250, 
                    Number(comissao_extra_desconto) || 100,
                    Number(salario_base) || 0, 
                    Number(comissao_maquina_producao) || 100,
                    Number(meta_maquinas) || 10,
                    Number(premio_meta) || 1000,
                    Number(bonus_meta) || 1000,
                    Number(dia_15_percent) || 50,
                    Number(dia_30_percent) || 50
                ];
                
                db.run(sql, params, function(err) {
                    if (err) {
                        console.error('Erro no SQLite fallback:', err);
                        return res.status(500).json({ error: err.message });
                    }
                    console.log('Funcionário inserido no SQLite fallback com ID:', this.lastID);
                    res.json({ 
                        id: this.lastID, 
                        nome, 
                        tipo, 
                        comissao_maquina_grande: Number(comissao_maquina_grande) || 450, 
                        comissao_maquina_pequena: Number(comissao_maquina_pequena) || 250, 
                        comissao_extra_desconto: Number(comissao_extra_desconto) || 100,
                        salario_base: Number(salario_base) || 0, 
                        comissao_maquina_producao: Number(comissao_maquina_producao) || 100,
                        meta_maquinas: Number(meta_maquinas) || 10,
                        premio_meta: Number(premio_meta) || 1000,
                        bonus_meta: Number(bonus_meta) || 1000,
                        dia_15_percent: Number(dia_15_percent) || 50,
                        dia_30_percent: Number(dia_30_percent) || 50,
                        ativo: true
                    });
                });
            }
        } else {
            // Usar SQLite local
            const sql = 'INSERT INTO funcionarios (nome, tipo, comissao_maquina_grande, comissao_maquina_pequena, comissao_extra_desconto, salario_base, comissao_maquina_producao, meta_maquinas, premio_meta, bonus_meta, dia_15_percent, dia_30_percent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
            const params = [
                nome, 
                tipo, 
                Number(comissao_maquina_grande) || 450, 
                Number(comissao_maquina_pequena) || 250, 
                Number(comissao_extra_desconto) || 100,
                Number(salario_base) || 0, 
                Number(comissao_maquina_producao) || 100,
                Number(meta_maquinas) || 10,
                Number(premio_meta) || 1000,
                Number(bonus_meta) || 1000,
                Number(dia_15_percent) || 50,
                Number(dia_30_percent) || 50
            ];
            
            db.run(sql, params, function(err) {
                if (err) {
                    console.error('Erro no banco:', err);
                    return res.status(500).json({ error: err.message });
                }
                console.log('Funcionário inserido com ID:', this.lastID);
                res.json({ 
                    id: this.lastID, 
                    nome, 
                    tipo, 
                    comissao_maquina_grande: Number(comissao_maquina_grande) || 450, 
                    comissao_maquina_pequena: Number(comissao_maquina_pequena) || 250, 
                    comissao_extra_desconto: Number(comissao_extra_desconto) || 100,
                    salario_base: Number(salario_base) || 0, 
                    comissao_maquina_producao: Number(comissao_maquina_producao) || 100,
                    meta_maquinas: Number(meta_maquinas) || 10,
                    premio_meta: Number(premio_meta) || 1000,
                    bonus_meta: Number(bonus_meta) || 1000,
                    dia_15_percent: Number(dia_15_percent) || 50,
                    dia_30_percent: Number(dia_30_percent) || 50,
                    ativo: true
                });
            });
        }
    } catch (error) {
        console.error('Erro geral:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT funcionarios (editar)
app.put('/api/funcionarios/:id', async (req, res) => {
    console.log('=== PUT /api/funcionarios/:id ===');
    console.log('ID:', req.params.id);
    console.log('Dados recebidos:', req.body);
    
    try {
        const { id } = req.params;
        const { 
            nome, 
            tipo, 
            comissao_maquina_grande, 
            comissao_maquina_pequena, 
            comissao_extra_desconto,
            salario_base, 
            comissao_maquina_producao,
            meta_maquinas,
            premio_meta,
            bonus_meta,
            dia_15_percent,
            dia_30_percent
        } = req.body;
        
        // Validação básica
        if (!nome || !tipo) {
            return res.status(400).json({ error: 'Nome e tipo são obrigatórios' });
        }
        
        if (useSupabase) {
            // Usar PostgreSQL direto
            console.log('Atualizando funcionário no PostgreSQL...');
            const { Client } = require('pg');
            
            try {
                const poolerUrl = databaseUrl.replace(
                    'postgresql://postgres:tiVW2cmpeVStByLm@db.yuwddqxdnyjvilbmjooc.supabase.co:5432/postgres',
                    'postgresql://postgres.yuwddqxdnyjvilbmjooc:tiVW2cmpeVStByLm@aws-1-sa-east-1.pooler.supabase.com:6543/postgres'
                );
                
                const client = new Client({
                    connectionString: poolerUrl,
                    ssl: { rejectUnauthorized: false },
                    connectionTimeoutMillis: 10000,
                    query_timeout: 10000
                });
                
                await client.connect();
                
                const result = await client.query(
                    `UPDATE funcionarios SET 
                     nome = $1, tipo = $2, comissao_maquina_grande = $3, comissao_maquina_pequena = $4,
                     comissao_extra_desconto = $5, salario_base = $6, comissao_maquina_producao = $7,
                     meta_maquinas = $8, premio_meta = $9, bonus_meta = $10, dia_15_percent = $11, dia_30_percent = $12, updated_at = NOW()
                     WHERE id = $13 RETURNING *`,
                    [
                        nome, 
                        tipo, 
                        Number(comissao_maquina_grande) || 450, 
                        Number(comissao_maquina_pequena) || 250, 
                        Number(comissao_extra_desconto) || 100,
                        Number(salario_base) || 0, 
                        Number(comissao_maquina_producao) || 100,
                        Number(meta_maquinas) || 10,
                        Number(premio_meta) || 1000,
                        Number(bonus_meta) || 1000,
                        Number(dia_15_percent) || 50,
                        Number(dia_30_percent) || 50,
                        id
                    ]
                );
                
                console.log('Funcionário atualizado no PostgreSQL:', result.rows[0]);
                await client.end();
                res.json(result.rows[0]);
                
            } catch (pgError) {
                console.log('PostgreSQL falhou, usando SQLite fallback:', pgError.message);
                res.status(500).json({ error: pgError.message });
            }
        } else {
            // Usar SQLite local
            const sql = `UPDATE funcionarios SET 
                nome = ?, tipo = ?, comissao_maquina_grande = ?, comissao_maquina_pequena = ?,
                comissao_extra_desconto = ?, salario_base = ?, comissao_maquina_producao = ?,
                meta_maquinas = ?, premio_meta = ?, bonus_meta = ?, dia_15_percent = ?, dia_30_percent = ?
                WHERE id = ?`;
            
            const params = [
                nome, 
                tipo, 
                Number(comissao_maquina_grande) || 450, 
                Number(comissao_maquina_pequena) || 250, 
                Number(comissao_extra_desconto) || 100,
                Number(salario_base) || 0, 
                Number(comissao_maquina_producao) || 100,
                Number(meta_maquinas) || 10,
                Number(premio_meta) || 1000,
                Number(bonus_meta) || 1000,
                Number(dia_15_percent) || 50,
                Number(dia_30_percent) || 50,
                id
            ];
            
            db.run(sql, params, function(err) {
                if (err) {
                    console.error('Erro ao atualizar:', err);
                    return res.status(500).json({ error: err.message });
                }
                console.log('Funcionário atualizado com ID:', id);
                res.json({ 
                    id: Number(id), 
                    nome, 
                    tipo, 
                    comissao_maquina_grande: Number(comissao_maquina_grande) || 450, 
                    comissao_maquina_pequena: Number(comissao_maquina_pequena) || 250, 
                    comissao_extra_desconto: Number(comissao_extra_desconto) || 100,
                    salario_base: Number(salario_base) || 0, 
                    comissao_maquina_producao: Number(comissao_maquina_producao) || 100,
                    meta_maquinas: Number(meta_maquinas) || 10,
                    premio_meta: Number(premio_meta) || 1000,
                    bonus_meta: Number(bonus_meta) || 1000,
                    dia_15_percent: Number(dia_15_percent) || 50,
                    dia_30_percent: Number(dia_30_percent) || 50,
                    ativo: true
                });
            });
        }
    } catch (error) {
        console.error('Erro geral:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE funcionarios/:id
app.delete('/api/funcionarios/:id', async (req, res) => {
    console.log('=== DELETE /api/funcionarios/:id ===');
    console.log('ID:', req.params.id);
    
    try {
        const { id } = req.params;
        
        if (useSupabase) {
            // Usar PostgreSQL direto
            console.log('Excluindo funcionário no PostgreSQL...');
            const { Client } = require('pg');
            
            try {
                const poolerUrl = databaseUrl.replace(
                    'postgresql://postgres:tiVW2cmpeVStByLm@db.yuwddqxdnyjvilbmjooc.supabase.co:5432/postgres',
                    'postgresql://postgres.yuwddqxdnyjvilbmjooc:tiVW2cmpeVStByLm@aws-1-sa-east-1.pooler.supabase.com:6543/postgres'
                );
                
                const client = new Client({
                    connectionString: poolerUrl,
                    ssl: { rejectUnauthorized: false },
                    connectionTimeoutMillis: 10000,
                    query_timeout: 10000
                });
                
                await client.connect();
                
                const result = await client.query('DELETE FROM funcionarios WHERE id = $1 RETURNING *', [id]);
                
                console.log('Funcionário excluído no PostgreSQL:', result.rows[0]);
                await client.end();
                res.json({ message: 'Funcionário excluído com sucesso!' });
                
            } catch (pgError) {
                console.log('PostgreSQL falhou, usando SQLite fallback:', pgError.message);
                res.status(500).json({ error: pgError.message });
            }
        } else {
            // Usar SQLite local
            const sql = 'DELETE FROM funcionarios WHERE id = ?';
            
            db.run(sql, [id], function(err) {
                if (err) {
                    console.error('Erro ao excluir:', err);
                    return res.status(500).json({ error: err.message });
                }
                console.log('Funcionário excluído com ID:', id);
                res.json({ message: 'Funcionário excluído com sucesso!' });
            });
        }
    } catch (error) {
        console.error('Erro geral:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT funcionarios/:id/desativar
app.put('/api/funcionarios/:id/desativar', async (req, res) => {
    console.log('=== PUT /api/funcionarios/:id/desativar ===');
    console.log('ID:', req.params.id);
    
    try {
        const { id } = req.params;
        
        if (useSupabase) {
            // Usar PostgreSQL direto
            console.log('Desativando funcionário no PostgreSQL...');
            const { Client } = require('pg');
            
            try {
                const poolerUrl = databaseUrl.replace(
                    'postgresql://postgres:tiVW2cmpeVStByLm@db.yuwddqxdnyjvilbmjooc.supabase.co:5432/postgres',
                    'postgresql://postgres.yuwddqxdnyjvilbmjooc:tiVW2cmpeVStByLm@aws-1-sa-east-1.pooler.supabase.com:6543/postgres'
                );
                
                const client = new Client({
                    connectionString: poolerUrl,
                    ssl: { rejectUnauthorized: false },
                    connectionTimeoutMillis: 10000,
                    query_timeout: 10000
                });
                
                await client.connect();
                
                const result = await client.query(
                    'UPDATE funcionarios SET ativo = false, updated_at = NOW() WHERE id = $1 RETURNING *',
                    [id]
                );
                
                console.log('Funcionário desativado no PostgreSQL:', result.rows[0]);
                await client.end();
                res.json({ message: 'Funcionário desativado com sucesso!' });
                
            } catch (pgError) {
                console.log('PostgreSQL falhou, usando SQLite fallback:', pgError.message);
                res.status(500).json({ error: pgError.message });
            }
        } else {
            // Usar SQLite local
            const sql = 'UPDATE funcionarios SET ativo = 0 WHERE id = ?';
            
            db.run(sql, [id], function(err) {
                if (err) {
                    console.error('Erro ao desativar:', err);
                    return res.status(500).json({ error: err.message });
                }
                console.log('Funcionário desativado com ID:', id);
                res.json({ message: 'Funcionário desativado com sucesso!' });
            });
        }
    } catch (error) {
        console.error('Erro geral:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST vendas
app.post('/api/vendas', async (req, res) => {
    console.log('=== POST /api/vendas ===');
    console.log('Dados recebidos:', req.body);
    
    try {
        const { id_funcionario, tipo_maquina, quantidade_maquinas, com_desconto, data_venda } = req.body;
        
        // Validação básica
        if (!id_funcionario || !tipo_maquina || !quantidade_maquinas || !data_venda) {
            console.log('Erro: Campos obrigatórios faltando');
            return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
        }
        
        if (useSupabase) {
            // Usar PostgreSQL direto
            console.log('Inserindo venda no PostgreSQL...');
            const { Client } = require('pg');
            
            try {
                // Usar o endpoint correto do pooler
                const poolerUrl = databaseUrl.replace(
                    'postgresql://postgres:tiVW2cmpeVStByLm@db.yuwddqxdnyjvilbmjooc.supabase.co:5432/postgres',
                    'postgresql://postgres.yuwddqxdnyjvilbmjooc:tiVW2cmpeVStByLm@aws-1-sa-east-1.pooler.supabase.com:6543/postgres'
                );
                
                const client = new Client({
                    connectionString: poolerUrl,
                    ssl: { rejectUnauthorized: false },
                    connectionTimeoutMillis: 10000,
                    query_timeout: 10000
                });
                
                await client.connect();
                
                // Verificar se funcionário existe e está ativo
                const funcResult = await client.query('SELECT id, nome, ativo FROM funcionarios WHERE id = $1', [id_funcionario]);
                
                if (funcResult.rows.length === 0) {
                    console.error('Funcionário não encontrado:', id_funcionario);
                    await client.end();
                    return res.status(400).json({ error: 'Funcionário não encontrado' });
                }
                
                if (!funcResult.rows[0].ativo) {
                    console.error('Funcionário está inativo:', id_funcionario);
                    await client.end();
                    return res.status(400).json({ error: 'Funcionário está inativo' });
                }
                
                // Inserir venda
                const result = await client.query(
                    `INSERT INTO vendas (id_funcionario, tipo_maquina, quantidade_maquinas, com_desconto, data_venda, mes) 
                     VALUES ($1, $2, $3, $4, $5, TO_CHAR($5::date, 'YYYY-MM')) RETURNING *`,
                    [id_funcionario, tipo_maquina, quantidade_maquinas, com_desconto, data_venda]
                );
                
                console.log('Venda inserida no PostgreSQL:', result.rows[0]);
                await client.end();
                
                // Adicionar nome do funcionário na resposta
                const vendaResponse = {
                    ...result.rows[0],
                    nome_funcionario: funcResult.rows[0].nome
                };
                
                res.json(vendaResponse);
                
            } catch (pgError) {
                console.log('PostgreSQL falhou, usando SQLite fallback:', pgError.message);
                
                // Fallback para SQLite
                db.get('SELECT id, nome, ativo FROM funcionarios WHERE id = ?', [id_funcionario], (err, row) => {
                    if (err) {
                        console.error('Erro ao verificar funcionário:', err);
                        return res.status(500).json({ error: err.message });
                    }
                    
                    if (!row) {
                        console.error('Funcionário não encontrado:', id_funcionario);
                        return res.status(400).json({ error: 'Funcionário não encontrado' });
                    }
                    
                    if (!row.ativo) {
                        console.error('Funcionário está inativo:', id_funcionario);
                        return res.status(400).json({ error: 'Funcionário está inativo' });
                    }
                    
                    // Inserir venda
                    const mes = data_venda.substring(0, 7); // Extrair YYYY-MM
                    const sql = 'INSERT INTO vendas (id_funcionario, tipo_maquina, quantidade_maquinas, com_desconto, data_venda, mes) VALUES (?, ?, ?, ?, ?, ?)';
                    const params = [id_funcionario, tipo_maquina, quantidade_maquinas, com_desconto, data_venda, mes];
                    
                    db.run(sql, params, function(err) {
                        if (err) {
                            console.error('Erro ao inserir venda:', err);
                            return res.status(500).json({ error: err.message });
                        }
                        console.log('Venda inserida com ID:', this.lastID);
                        res.json({ 
                            id: this.lastID, 
                            id_funcionario, 
                            tipo_maquina, 
                            quantidade_maquinas, 
                            com_desconto, 
                            data_venda,
                            nome_funcionario: row.nome
                        });
                    });
                });
            }
        } else {
            // Usar SQLite local
            db.get('SELECT id, nome, ativo FROM funcionarios WHERE id = ?', [id_funcionario], (err, row) => {
                if (err) {
                    console.error('Erro ao verificar funcionário:', err);
                    return res.status(500).json({ error: err.message });
                }
                
                if (!row) {
                    console.error('Funcionário não encontrado:', id_funcionario);
                    return res.status(400).json({ error: 'Funcionário não encontrado' });
                }
                
                if (!row.ativo) {
                    console.error('Funcionário está inativo:', id_funcionario);
                    return res.status(400).json({ error: 'Funcionário está inativo' });
                }
                
                // Inserir venda
                const mes = data_venda.substring(0, 7); // Extrair YYYY-MM
                const sql = 'INSERT INTO vendas (id_funcionario, tipo_maquina, quantidade_maquinas, com_desconto, data_venda, mes) VALUES (?, ?, ?, ?, ?, ?)';
                const params = [id_funcionario, tipo_maquina, quantidade_maquinas, com_desconto, data_venda, mes];
                
                db.run(sql, params, function(err) {
                    if (err) {
                        console.error('Erro ao inserir venda:', err);
                        return res.status(500).json({ error: err.message });
                    }
                    console.log('Venda inserida com ID:', this.lastID);
                    res.json({ 
                        id: this.lastID, 
                        id_funcionario, 
                        tipo_maquina, 
                        quantidade_maquinas, 
                        com_desconto, 
                        data_venda,
                        nome_funcionario: row.nome
                    });
                });
            });
        }
    } catch (error) {
        console.error('Erro geral:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET vendas
app.get('/api/vendas', async (req, res) => {
    console.log('=== GET /api/vendas chamado ===');
    console.log('useSupabase:', useSupabase);
    
    if (useSupabase) {
        // Usar PostgreSQL direto
        console.log('Buscando vendas no PostgreSQL...');
        const { Client } = require('pg');
        
        try {
            // Usar o endpoint correto do pooler
            const poolerUrl = databaseUrl.replace(
                'postgresql://postgres:tiVW2cmpeVStByLm@db.yuwddqxdnyjvilbmjooc.supabase.co:5432/postgres',
                'postgresql://postgres.yuwddqxdnyjvilbmjooc:tiVW2cmpeVStByLm@aws-1-sa-east-1.pooler.supabase.com:6543/postgres'
            );
            
            const client = new Client({
                connectionString: poolerUrl,
                ssl: { rejectUnauthorized: false },
                connectionTimeoutMillis: 10000,
                query_timeout: 10000
            });
            
            await client.connect();
            
            const result = await client.query(`
                SELECT v.*, f.nome as nome_funcionario 
                FROM vendas v 
                LEFT JOIN funcionarios f ON v.id_funcionario = f.id
                ORDER BY v.data_venda DESC
            `);
            
            console.log('Vendas encontradas no PostgreSQL:', result.rows.length);
            console.log('Dados:', result.rows);
            
            await client.end();
            
            res.json(result.rows);
            
        } catch (error) {
            console.log('Erro no PostgreSQL, usando SQLite fallback:', error.message);
            
            // Fallback para SQLite
            const query = `
                SELECT v.*, f.nome as nome_funcionario 
                FROM vendas v 
                LEFT JOIN funcionarios f ON v.id_funcionario = f.id
                ORDER BY v.data_venda DESC
            `;
            
            db.all(query, (err, rows) => {
                if (err) {
                    console.error('Erro no SQLite fallback:', err);
                    return res.status(500).json({ error: err.message });
                }
                console.log('Vendas encontradas no SQLite fallback:', rows?.length || 0);
                console.log('Dados SQLite:', rows);
                res.json(rows);
            });
        }
    } else {
        // Usar SQLite local
        console.log('Usando SQLite local para vendas...');
        const query = `
            SELECT v.*, f.nome as nome_funcionario 
            FROM vendas v 
            LEFT JOIN funcionarios f ON v.id_funcionario = f.id
            ORDER BY v.data_venda DESC
        `;
        
        db.all(query, (err, rows) => {
            if (err) {
                console.error('Erro no SQLite local:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            console.log('Vendas encontradas no SQLite local:', rows?.length || 0);
            console.log('Dados SQLite local:', rows);
            res.json(rows);
        });
    }
});

// PUT vendas (editar)
app.put('/api/vendas/:id', async (req, res) => {
    console.log('=== PUT /api/vendas/:id ===');
    console.log('ID:', req.params.id);
    console.log('Dados recebidos:', req.body);
    
    try {
        const { id } = req.params;
        const { id_funcionario, tipo_maquina, quantidade_maquinas, com_desconto, data_venda } = req.body;
        
        // Validação básica
        if (!id_funcionario || !tipo_maquina || !quantidade_maquinas || !data_venda) {
            return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
        }
        
        if (useSupabase) {
            // Usar PostgreSQL direto
            console.log('Atualizando venda no PostgreSQL...');
            const { Client } = require('pg');
            
            try {
                const poolerUrl = databaseUrl.replace(
                    'postgresql://postgres:tiVW2cmpeVStByLm@db.yuwddqxdnyjvilbmjooc.supabase.co:5432/postgres',
                    'postgresql://postgres.yuwddqxdnyjvilbmjooc:tiVW2cmpeVStByLm@aws-1-sa-east-1.pooler.supabase.com:6543/postgres'
                );
                
                const client = new Client({
                    connectionString: poolerUrl,
                    ssl: { rejectUnauthorized: false },
                    connectionTimeoutMillis: 10000,
                    query_timeout: 10000
                });
                
                await client.connect();
                
                // Verificar se funcionário existe e está ativo
                const funcResult = await client.query('SELECT id, nome, ativo FROM funcionarios WHERE id = $1', [id_funcionario]);
                
                if (funcResult.rows.length === 0) {
                    await client.end();
                    return res.status(400).json({ error: 'Funcionário não encontrado' });
                }
                
                if (!funcResult.rows[0].ativo) {
                    await client.end();
                    return res.status(400).json({ error: 'Funcionário está inativo' });
                }
                
                // Atualizar venda
                const result = await client.query(
                    `UPDATE vendas SET 
                     id_funcionario = $1, tipo_maquina = $2, quantidade_maquinas = $3, 
                     com_desconto = $4, data_venda = $5, updated_at = NOW()
                     WHERE id = $6 RETURNING *`,
                    [id_funcionario, tipo_maquina, quantidade_maquinas, com_desconto, data_venda, id]
                );
                
                console.log('Venda atualizada no PostgreSQL:', result.rows[0]);
                await client.end();
                
                // Adicionar nome do funcionário na resposta
                const vendaResponse = {
                    ...result.rows[0],
                    nome_funcionario: funcResult.rows[0].nome
                };
                
                res.json(vendaResponse);
                
            } catch (pgError) {
                console.log('PostgreSQL falhou:', pgError.message);
                res.status(500).json({ error: pgError.message });
            }
        } else {
            // Usar SQLite local
            const sql = `UPDATE vendas SET 
                id_funcionario = ?, tipo_maquina = ?, quantidade_maquinas = ?, 
                com_desconto = ?, data_venda = ?
                WHERE id = ?`;
            
            const params = [id_funcionario, tipo_maquina, quantidade_maquinas, com_desconto, data_venda, id];
            
            db.run(sql, params, function(err) {
                if (err) {
                    console.error('Erro ao atualizar venda:', err);
                    return res.status(500).json({ error: err.message });
                }
                
                // Buscar nome do funcionário
                db.get('SELECT nome FROM funcionarios WHERE id = ?', [id_funcionario], (err, row) => {
                    if (err) {
                        console.error('Erro ao buscar funcionário:', err);
                        return res.status(500).json({ error: err.message });
                    }
                    
                    res.json({ 
                        id: Number(id), 
                        id_funcionario, 
                        tipo_maquina, 
                        quantidade_maquinas, 
                        com_desconto, 
                        data_venda,
                        nome_funcionario: row ? row.nome : 'Desconhecido'
                    });
                });
            });
        }
    } catch (error) {
        console.error('Erro geral:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE vendas
app.delete('/api/vendas/:id', async (req, res) => {
    console.log('=== DELETE /api/vendas/:id ===');
    console.log('ID:', req.params.id);
    
    try {
        const { id } = req.params;
        
        if (useSupabase) {
            // Usar PostgreSQL direto
            console.log('Excluindo venda no PostgreSQL...');
            const { Client } = require('pg');
            
            try {
                const poolerUrl = databaseUrl.replace(
                    'postgresql://postgres:tiVW2cmpeVStByLm@db.yuwddqxdnyjvilbmjooc.supabase.co:5432/postgres',
                    'postgresql://postgres.yuwddqxdnyjvilbmjooc:tiVW2cmpeVStByLm@aws-1-sa-east-1.pooler.supabase.com:6543/postgres'
                );
                
                const client = new Client({
                    connectionString: poolerUrl,
                    ssl: { rejectUnauthorized: false },
                    connectionTimeoutMillis: 10000,
                    query_timeout: 10000
                });
                
                await client.connect();
                
                const result = await client.query('DELETE FROM vendas WHERE id = $1 RETURNING *', [id]);
                
                console.log('Venda excluída no PostgreSQL:', result.rows[0]);
                await client.end();
                
                res.json({ message: 'Venda excluída com sucesso!' });
                
            } catch (pgError) {
                console.log('PostgreSQL falhou, usando SQLite fallback:', pgError.message);
                
                // Fallback para SQLite
                db.run('DELETE FROM vendas WHERE id = ?', [id], function(err) {
                    if (err) {
                        console.error('Erro ao excluir venda:', err);
                        return res.status(500).json({ error: err.message });
                    }
                    console.log('Venda excluída com ID:', id);
                    res.json({ message: 'Venda excluída com sucesso!' });
                });
            }
        } else {
            // Usar SQLite local
            db.run('DELETE FROM vendas WHERE id = ?', [id], function(err) {
                if (err) {
                    console.error('Erro ao excluir venda:', err);
                    return res.status(500).json({ error: err.message });
                }
                console.log('Venda excluída com ID:', id);
                res.json({ message: 'Venda excluída com sucesso!' });
            });
        }
    } catch (error) {
        console.error('Erro geral:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET producao
app.get('/api/producao', async (req, res) => {
    console.log('=== GET /api/producao chamado ===');
    console.log('useSupabase:', useSupabase);
    
    if (useSupabase) {
        // Usar PostgreSQL direto
        console.log('Buscando produção no PostgreSQL...');
        const { Client } = require('pg');
        
        try {
            // Usar o endpoint correto do pooler
            const poolerUrl = databaseUrl.replace(
                'postgresql://postgres:tiVW2cmpeVStByLm@db.yuwddqxdnyjvilbmjooc.supabase.co:5432/postgres',
                'postgresql://postgres.yuwddqxdnyjvilbmjooc:tiVW2cmpeVStByLm@aws-1-sa-east-1.pooler.supabase.com:6543/postgres'
            );
            
            const client = new Client({
                connectionString: poolerUrl,
                ssl: { rejectUnauthorized: false },
                connectionTimeoutMillis: 10000,
                query_timeout: 10000
            });
            
            await client.connect();
            
            const result = await client.query(`
                SELECT p.*, f.nome as nome_funcionario 
                FROM producao p 
                LEFT JOIN funcionarios f ON p.id_funcionario = f.id
                ORDER BY p.data_producao DESC
            `);
            
            console.log('Produção encontrada no PostgreSQL:', result.rows.length);
            console.log('Dados:', result.rows);
            
            await client.end();
            
            res.json(result.rows);
            
        } catch (error) {
            console.log('Erro no PostgreSQL, usando SQLite fallback:', error.message);
            
            // Fallback para SQLite
            const query = `
                SELECT p.*, f.nome as nome_funcionario 
                FROM producao p 
                LEFT JOIN funcionarios f ON p.id_funcionario = f.id
                ORDER BY p.data_producao DESC
            `;
            
            db.all(query, (err, rows) => {
                if (err) {
                    console.error('Erro no SQLite fallback:', err);
                    return res.status(500).json({ error: err.message });
                }
                console.log('Produção encontrada no SQLite fallback:', rows?.length || 0);
                console.log('Dados SQLite:', rows);
                res.json(rows);
            });
        }
    } else {
        // Usar SQLite local
        console.log('Usando SQLite local para produção...');
        const query = `
            SELECT p.*, f.nome as nome_funcionario 
            FROM producao p 
            LEFT JOIN funcionarios f ON p.id_funcionario = f.id
            ORDER BY p.data_producao DESC
        `;
        
        db.all(query, (err, rows) => {
            if (err) {
                console.error('Erro no SQLite local:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            console.log('Produção encontrada no SQLite local:', rows?.length || 0);
            console.log('Dados SQLite local:', rows);
            res.json(rows);
        });
    }
});

// POST producao
app.post('/api/producao', async (req, res) => {
    console.log('=== POST /api/producao ===');
    console.log('Dados recebidos:', req.body);
    
    try {
        const { id_funcionario, maquinas_produzidas, data_producao, quinzena } = req.body;
        
        // Validação básica
        if (!id_funcionario || !maquinas_produzidas || !data_producao || !quinzena) {
            console.log('Erro: Campos obrigatórios faltando');
            return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
        }
        
        if (useSupabase) {
            // Usar PostgreSQL direto
            console.log('Inserindo produção no PostgreSQL...');
            const { Client } = require('pg');
            
            try {
                // Usar o endpoint correto do pooler
                const poolerUrl = databaseUrl.replace(
                    'postgresql://postgres:tiVW2cmpeVStByLm@db.yuwddqxdnyjvilbmjooc.supabase.co:5432/postgres',
                    'postgresql://postgres.yuwddqxdnyjvilbmjooc:tiVW2cmpeVStByLm@aws-1-sa-east-1.pooler.supabase.com:6543/postgres'
                );
                
                const client = new Client({
                    connectionString: poolerUrl,
                    ssl: { rejectUnauthorized: false },
                    connectionTimeoutMillis: 10000,
                    query_timeout: 10000
                });
                
                await client.connect();
                
                // Verificar se funcionário existe e está ativo
                const funcResult = await client.query('SELECT id, nome, ativo FROM funcionarios WHERE id = $1', [id_funcionario]);
                
                if (funcResult.rows.length === 0) {
                    console.error('Funcionário não encontrado:', id_funcionario);
                    await client.end();
                    return res.status(400).json({ error: 'Funcionário não encontrado' });
                }
                
                if (!funcResult.rows[0].ativo) {
                    console.error('Funcionário está inativo:', id_funcionario);
                    await client.end();
                    return res.status(400).json({ error: 'Funcionário está inativo' });
                }
                
                // Inserir produção
                const result = await client.query(
                    `INSERT INTO producao (id_funcionario, maquinas_produzidas, data_producao, quinzena) 
                     VALUES ($1, $2, $3, $4) RETURNING *`,
                    [id_funcionario, maquinas_produzidas, data_producao, quinzena]
                );
                
                console.log('Produção inserida no PostgreSQL:', result.rows[0]);
                await client.end();
                
                // Adicionar nome do funcionário na resposta
                const producaoResponse = {
                    ...result.rows[0],
                    nome_funcionario: funcResult.rows[0].nome
                };
                
                res.json(producaoResponse);
                
            } catch (pgError) {
                console.log('PostgreSQL falhou, usando SQLite fallback:', pgError.message);
                
                // Fallback para SQLite
                db.get('SELECT id, nome, ativo FROM funcionarios WHERE id = ?', [id_funcionario], (err, row) => {
                    if (err) {
                        console.error('Erro ao verificar funcionário:', err);
                        return res.status(500).json({ error: err.message });
                    }
                    
                    if (!row) {
                        console.error('Funcionário não encontrado:', id_funcionario);
                        return res.status(400).json({ error: 'Funcionário não encontrado' });
                    }
                    
                    if (!row.ativo) {
                        console.error('Funcionário está inativo:', id_funcionario);
                        return res.status(400).json({ error: 'Funcionário está inativo' });
                    }
                    
                    // Inserir produção
                    const sql = 'INSERT INTO producao (id_funcionario, maquinas_produzidas, data_producao, quinzena) VALUES (?, ?, ?, ?)';
                    const params = [id_funcionario, maquinas_produzidas, data_producao, quinzena];
                    
                    db.run(sql, params, function(err) {
                        if (err) {
                            console.error('Erro ao inserir produção:', err);
                            return res.status(500).json({ error: err.message });
                        }
                        console.log('Produção inserida com ID:', this.lastID);
                        res.json({ 
                            id: this.lastID, 
                            id_funcionario, 
                            maquinas_produzidas, 
                            data_producao,
                            nome_funcionario: row.nome
                        });
                    });
                });
            }
        } else {
            // Usar SQLite local
            db.get('SELECT id, nome, ativo FROM funcionarios WHERE id = ?', [id_funcionario], (err, row) => {
                if (err) {
                    console.error('Erro ao verificar funcionário:', err);
                    return res.status(500).json({ error: err.message });
                }
                
                if (!row) {
                    console.error('Funcionário não encontrado:', id_funcionario);
                    return res.status(400).json({ error: 'Funcionário não encontrado' });
                }
                
                if (!row.ativo) {
                    console.error('Funcionário está inativo:', id_funcionario);
                    return res.status(400).json({ error: 'Funcionário está inativo' });
                }
                
                // Inserir produção
                const sql = 'INSERT INTO producao (id_funcionario, maquinas_produzidas, data_producao) VALUES (?, ?, ?)';
                const params = [id_funcionario, maquinas_produzidas, data_producao];
                
                db.run(sql, params, function(err) {
                    if (err) {
                        console.error('Erro ao inserir produção:', err);
                        return res.status(500).json({ error: err.message });
                    }
                    console.log('Produção inserida com ID:', this.lastID);
                    res.json({ 
                        id: this.lastID, 
                        id_funcionario, 
                        maquinas_produzidas, 
                        data_producao,
                        nome_funcionario: row.nome
                    });
                });
            });
        }
    } catch (error) {
        console.error('Erro geral:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT producao (editar)
app.put('/api/producao/:id', async (req, res) => {
    console.log('=== PUT /api/producao/:id ===');
    console.log('ID:', req.params.id);
    console.log('Dados recebidos:', req.body);
    
    try {
        const { id } = req.params;
        const { id_funcionario, maquinas_produzidas, data_producao } = req.body;
        
        // Validação básica
        if (!id_funcionario || !maquinas_produzidas || !data_producao) {
            return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
        }
        
        if (useSupabase) {
            // Usar PostgreSQL direto
            console.log('Atualizando produção no PostgreSQL...');
            const { Client } = require('pg');
            
            try {
                const poolerUrl = databaseUrl.replace(
                    'postgresql://postgres:tiVW2cmpeVStByLm@db.yuwddqxdnyjvilbmjooc.supabase.co:5432/postgres',
                    'postgresql://postgres.yuwddqxdnyjvilbmjooc:tiVW2cmpeVStByLm@aws-1-sa-east-1.pooler.supabase.com:6543/postgres'
                );
                
                const client = new Client({
                    connectionString: poolerUrl,
                    ssl: { rejectUnauthorized: false },
                    connectionTimeoutMillis: 10000,
                    query_timeout: 10000
                });
                
                await client.connect();
                
                // Verificar se funcionário existe e está ativo
                const funcResult = await client.query('SELECT id, nome, ativo FROM funcionarios WHERE id = $1', [id_funcionario]);
                
                if (funcResult.rows.length === 0) {
                    await client.end();
                    return res.status(400).json({ error: 'Funcionário não encontrado' });
                }
                
                if (!funcResult.rows[0].ativo) {
                    await client.end();
                    return res.status(400).json({ error: 'Funcionário está inativo' });
                }
                
                // Atualizar produção
                const result = await client.query(
                    `UPDATE producao SET 
                     id_funcionario = $1, maquinas_produzidas = $2, data_producao = $3, updated_at = NOW()
                     WHERE id = $4 RETURNING *`,
                    [id_funcionario, maquinas_produzidas, data_producao, id]
                );
                
                console.log('Produção atualizada no PostgreSQL:', result.rows[0]);
                await client.end();
                
                // Adicionar nome do funcionário na resposta
                const producaoResponse = {
                    ...result.rows[0],
                    nome_funcionario: funcResult.rows[0].nome
                };
                
                res.json(producaoResponse);
                
            } catch (pgError) {
                console.log('PostgreSQL falhou:', pgError.message);
                res.status(500).json({ error: pgError.message });
            }
        } else {
            // Usar SQLite local
            const sql = `UPDATE producao SET 
                id_funcionario = ?, maquinas_produzidas = ?, data_producao = ?
                WHERE id = ?`;
            
            const params = [id_funcionario, maquinas_produzidas, data_producao, id];
            
            db.run(sql, params, function(err) {
                if (err) {
                    console.error('Erro ao atualizar produção:', err);
                    return res.status(500).json({ error: err.message });
                }
                
                // Buscar nome do funcionário
                db.get('SELECT nome FROM funcionarios WHERE id = ?', [id_funcionario], (err, row) => {
                    if (err) {
                        console.error('Erro ao buscar funcionário:', err);
                        return res.status(500).json({ error: err.message });
                    }
                    
                    res.json({ 
                        id: Number(id), 
                        id_funcionario, 
                        maquinas_produzidas, 
                        data_producao,
                        nome_funcionario: row ? row.nome : 'Desconhecido'
                    });
                });
            });
        }
    } catch (error) {
        console.error('Erro geral:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE producao
app.delete('/api/producao/:id', async (req, res) => {
    console.log('=== DELETE /api/producao/:id ===');
    console.log('ID:', req.params.id);
    
    try {
        const { id } = req.params;
        
        if (useSupabase) {
            // Usar PostgreSQL direto
            console.log('Excluindo produção no PostgreSQL...');
            const { Client } = require('pg');
            
            try {
                const poolerUrl = databaseUrl.replace(
                    'postgresql://postgres:tiVW2cmpeVStByLm@db.yuwddqxdnyjvilbmjooc.supabase.co:5432/postgres',
                    'postgresql://postgres.yuwddqxdnyjvilbmjooc:tiVW2cmpeVStByLm@aws-1-sa-east-1.pooler.supabase.com:6543/postgres'
                );
                
                const client = new Client({
                    connectionString: poolerUrl,
                    ssl: { rejectUnauthorized: false },
                    connectionTimeoutMillis: 10000,
                    query_timeout: 10000
                });
                
                await client.connect();
                
                const result = await client.query('DELETE FROM producao WHERE id = $1 RETURNING *', [id]);
                
                console.log('Produção excluída no PostgreSQL:', result.rows[0]);
                await client.end();
                
                res.json({ message: 'Produção excluída com sucesso!' });
                
            } catch (pgError) {
                console.log('PostgreSQL falhou, usando SQLite fallback:', pgError.message);
                
                // Fallback para SQLite
                db.run('DELETE FROM producao WHERE id = ?', [id], function(err) {
                    if (err) {
                        console.error('Erro ao excluir produção:', err);
                        return res.status(500).json({ error: err.message });
                    }
                    console.log('Produção excluída com ID:', id);
                    res.json({ message: 'Produção excluída com sucesso!' });
                });
            }
        } else {
            // Usar SQLite local
            db.run('DELETE FROM producao WHERE id = ?', [id], function(err) {
                if (err) {
                    console.error('Erro ao excluir produção:', err);
                    return res.status(500).json({ error: err.message });
                }
                console.log('Produção excluída com ID:', id);
                res.json({ message: 'Produção excluída com sucesso!' });
            });
        }
    } catch (error) {
        console.error('Erro geral:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET folha-pagamento
app.get('/api/folha-pagamento', async (req, res) => {
    console.log('=== GET /api/folha-pagamento chamado ===');
    console.log('useSupabase:', useSupabase);
    
    if (useSupabase) {
        // Usar PostgreSQL direto
        console.log('Buscando folha de pagamento no PostgreSQL...');
        const { Client } = require('pg');
        
        try {
            // Usar o endpoint correto do pooler
            const poolerUrl = databaseUrl.replace(
                'postgresql://postgres:tiVW2cmpeVStByLm@db.yuwddqxdnyjvilbmjooc.supabase.co:5432/postgres',
                'postgresql://postgres.yuwddqxdnyjvilbmjooc:tiVW2cmpeVStByLm@aws-1-sa-east-1.pooler.supabase.com:6543/postgres'
            );
            
            const client = new Client({
                connectionString: poolerUrl,
                ssl: { rejectUnauthorized: false },
                connectionTimeoutMillis: 10000,
                query_timeout: 10000
            });
            
            await client.connect();
            
            const result = await client.query(`
                SELECT fp.*, f.nome as nome_funcionario, f.tipo 
                FROM folha_pagamento fp 
                LEFT JOIN funcionarios f ON fp.id_funcionario = f.id
                ORDER BY fp.mes_referencia DESC, f.nome ASC
            `);
            
            console.log('Folha de pagamento encontrada no PostgreSQL:', result.rows.length);
            console.log('Dados:', result.rows);
            
            await client.end();
            
            res.json(result.rows);
            
        } catch (error) {
            console.log('Erro no PostgreSQL, usando SQLite fallback:', error.message);
            
            // Fallback para SQLite
            const query = `
                SELECT fp.*, f.nome as nome_funcionario 
                FROM folha_pagamento fp 
                LEFT JOIN funcionarios f ON fp.id_funcionario = f.id
                ORDER BY fp.mes_referencia DESC, f.nome ASC
            `;
            
            db.all(query, (err, rows) => {
                if (err) {
                    console.error('Erro no SQLite fallback:', err);
                    return res.status(500).json({ error: err.message });
                }
                console.log('Folha de pagamento encontrada no SQLite fallback:', rows?.length || 0);
                console.log('Dados SQLite:', rows);
                res.json(rows);
            });
        }
    } else {
        // Usar SQLite local
        console.log('Usando SQLite local para folha de pagamento...');
        const query = `
            SELECT fp.*, f.nome as nome_funcionario 
            FROM folha_pagamento fp 
            LEFT JOIN funcionarios f ON fp.id_funcionario = f.id
            ORDER BY fp.mes_referencia DESC, f.nome ASC
        `;
        
        db.all(query, (err, rows) => {
            if (err) {
                console.error('Erro no SQLite local:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            console.log('Folha de pagamento encontrada no SQLite local:', rows?.length || 0);
            console.log('Dados SQLite local:', rows);
            res.json(rows);
        });
    }
});

// GET folha-pagamento por mês
app.get('/api/folha-pagamento/:mes', async (req, res) => {
    console.log('=== GET /api/folha-pagamento/:mes chamado ===');
    console.log('Mês:', req.params.mes);
    console.log('useSupabase:', useSupabase);
    
    const { mes } = req.params;
    
    if (useSupabase) {
        // Usar PostgreSQL direto
        console.log('Buscando folha de pagamento no PostgreSQL...');
        const { Client } = require('pg');
        
        try {
            // Usar o endpoint correto do pooler
            const poolerUrl = databaseUrl.replace(
                'postgresql://postgres:tiVW2cmpeVStByLm@db.yuwddqxdnyjvilbmjooc.supabase.co:5432/postgres',
                'postgresql://postgres.yuwddqxdnyjvilbmjooc:tiVW2cmpeVStByLm@aws-1-sa-east-1.pooler.supabase.com:6543/postgres'
            );
            
            const client = new Client({
                connectionString: poolerUrl,
                ssl: { rejectUnauthorized: false },
                connectionTimeoutMillis: 10000,
                query_timeout: 10000
            });
            
            await client.connect();
            
            const result = await client.query(`
                SELECT fp.*, f.nome as nome_funcionario, f.tipo 
                FROM folha_pagamento fp 
                LEFT JOIN funcionarios f ON fp.id_funcionario = f.id
                WHERE fp.mes_referencia = $1
                ORDER BY f.nome ASC
            `, [mes]);
            
            console.log('Folha de pagamento encontrada no PostgreSQL:', result.rows.length);
            console.log('Dados:', result.rows);
            
            await client.end();
            
            res.json(result.rows);
            
        } catch (error) {
            console.log('Erro no PostgreSQL, usando SQLite fallback:', error.message);
            
            // Fallback para SQLite
            const query = `
                SELECT fp.*, f.nome as nome_funcionario 
                FROM folha_pagamento fp 
                LEFT JOIN funcionarios f ON fp.id_funcionario = f.id
                WHERE fp.mes_referencia = ?
                ORDER BY f.nome ASC
            `;
            
            db.all(query, [mes], (err, rows) => {
                if (err) {
                    console.error('Erro no SQLite fallback:', err);
                    return res.status(500).json({ error: err.message });
                }
                console.log('Folha de pagamento encontrada no SQLite fallback:', rows?.length || 0);
                console.log('Dados SQLite:', rows);
                res.json(rows);
            });
        }
    } else {
        // Usar SQLite local
        console.log('Usando SQLite local para folha de pagamento...');
        const query = `
            SELECT fp.*, f.nome as nome_funcionario 
            FROM folha_pagamento fp 
            LEFT JOIN funcionarios f ON fp.id_funcionario = f.id
            WHERE fp.mes_referencia = ?
            ORDER BY f.nome ASC
        `;
        
        db.all(query, [mes], (err, rows) => {
            if (err) {
                console.error('Erro no SQLite local:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            console.log('Folha de pagamento encontrada no SQLite local:', rows?.length || 0);
            console.log('Dados SQLite local:', rows);
            res.json(rows);
        });
    }
});

// POST folha-pagamento-quinzenal
app.post('/api/folha-pagamento-quinzenal', async (req, res) => {
    console.log('=== POST /api/folha-pagamento-quinzenal ===');
    console.log('Dados recebidos:', req.body);
    
    try {
        const { mes_referencia, quinzena, vales, outros_descontos } = req.body;
        
        // Validação básica
        if (!mes_referencia || !quinzena) {
            console.log('Erro: Campos obrigatórios faltando');
            return res.status(400).json({ error: 'Mês e quinzena são obrigatórios' });
        }
        
        if (quinzena !== 'dia_15' && quinzena !== 'dia_30') {
            console.log('Erro: Quinzena inválida');
            return res.status(400).json({ error: 'Quinzena deve ser "dia_15" ou "dia_30"' });
        }
        
        if (useSupabase) {
            // Usar PostgreSQL direto
            console.log('Gerando folha de pagamento quinzenal no PostgreSQL...');
            const { Client } = require('pg');
            
            try {
                const poolerUrl = databaseUrl.replace(
                    'postgresql://postgres:tiVW2cmpeVStByLm@db.yuwddqxdnyjvilbmjooc.supabase.co:5432/postgres',
                    'postgresql://postgres.yuwddqxdnyjvilbmjooc:tiVW2cmpeVStByLm@aws-1-sa-east-1.pooler.supabase.com:6543/postgres'
                );
                
                const client = new Client({
                    connectionString: poolerUrl,
                    ssl: { rejectUnauthorized: false },
                    connectionTimeoutMillis: 10000,
                    query_timeout: 10000
                });
                
                await client.connect();
                
                // Buscar funcionários ativos do tipo administrativo e produção
                const funcResult = await client.query(
                    "SELECT id, nome, tipo, salario_base, comissao_maquina_producao, dia_15_percent, dia_30_percent FROM funcionarios WHERE tipo IN ('administrativo', 'producao') AND ativo = true"
                );
                
                const folhasGeradas = [];
                
                for (const func of funcResult.rows) {
                    let salarioBase = 0;
                    let comissoes = 0;
                    let bonus = 0;
                    
                    if (func.tipo === 'administrativo') {
                        // Administrativo: só salário fixo, dividido por quinzena
                        const percent = quinzena === 'dia_15' ? func.dia_15_percent : func.dia_30_percent;
                        salarioBase = (func.salario_base || 0) * (percent / 100);
                    } else if (func.tipo === 'producao') {
                        // Produção: salário fixo dividido por quinzena + comissão (só no dia 30)
                        const percent = quinzena === 'dia_15' ? func.dia_15_percent : func.dia_30_percent;
                        salarioBase = (func.salario_base || 0) * (percent / 100);
                        
                        // Comissão só no dia 30 (última quinzena)
                        if (quinzena === 'dia_30') {
                            // Buscar produção do mês
                            const prodResult = await client.query(
                                "SELECT SUM(maquinas_produzidas) as total FROM producao WHERE id_funcionario = $1 AND TO_CHAR(data_producao, 'YYYY-MM') = $2",
                                [func.id, mes_referencia]
                            );
                            
                            const totalMaquinas = prodResult.rows[0].total || 0;
                            comissoes = totalMaquinas * (func.comissao_maquina_producao || 0);
                        }
                    }
                    
                    // Buscar vales pendentes do funcionário para o mês e quinzena
                    const valesResult = await client.query(
                        "SELECT COALESCE(SUM(valor), 0) as total FROM vales WHERE id_funcionario = $1 AND mes_referencia = $2 AND quinzena = $3 AND status = 'pendente'",
                        [func.id, mes_referencia, quinzena]
                    );
                    
                    const totalVales = valesResult.rows[0].total || 0;
                    
                    // Calcular total (salário + comissões - descontos)
                    const total = salarioBase + comissoes - totalVales - (outros_descontos || 0);
                    
                    // Inserir folha de pagamento
                    const result = await client.query(
                        `INSERT INTO folha_pagamento (id_funcionario, mes_referencia, quinzena, salario_base, comissoes, bonus, vales, outros_descontos, total, detalhe_comissoes) 
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
                        [func.id, mes_referencia, quinzena, salarioBase, comissoes, bonus, totalVales, outros_descontos || 0, total, null]
                    );
                    
                    folhasGeradas.push({
                        ...result.rows[0],
                        nome_funcionario: func.nome,
                        tipo: func.tipo
                    });
                }
                
                console.log('Folhas de pagamento quinzenal geradas:', folhasGeradas.length);
                await client.end();
                
                res.json(folhasGeradas);
                
            } catch (pgError) {
                console.log('PostgreSQL falhou, usando SQLite fallback:', pgError.message);
                res.status(500).json({ error: pgError.message });
            }
        } else {
            // Usar SQLite local
            db.all("SELECT id, nome, tipo, salario_base, comissao_maquina_producao, dia_15_percent, dia_30_percent FROM funcionarios WHERE tipo IN ('administrativo', 'producao') AND ativo = 1", [], async (err, rows) => {
                if (err) {
                    console.error('Erro ao buscar funcionários:', err);
                    return res.status(500).json({ error: err.message });
                }
                
                const folhasGeradas = [];
                
                for (const func of rows) {
                    let salarioBase = 0;
                    let comissoes = 0;
                    let bonus = 0;
                    
                    if (func.tipo === 'administrativo') {
                        // Administrativo: só salário fixo, dividido por quinzena
                        const percent = quinzena === 'dia_15' ? func.dia_15_percent : func.dia_30_percent;
                        salarioBase = (func.salario_base || 0) * (percent / 100);
                    } else if (func.tipo === 'producao') {
                        // Produção: salário fixo dividido por quinzena + comissão (só no dia 30)
                        const percent = quinzena === 'dia_15' ? func.dia_15_percent : func.dia_30_percent;
                        salarioBase = (func.salario_base || 0) * (percent / 100);
                        
                        // Comissão só no dia 30 (última quinzena)
                        if (quinzena === 'dia_30') {
                            // Buscar produção do mês
                            db.all("SELECT SUM(maquinas_produzidas) as total FROM producao WHERE id_funcionario = ? AND substr(data_producao, 1, 7) = ?", [func.id, mes_referencia], (prodErr, prodRows) => {
                                if (!prodErr && prodRows && prodRows.length > 0) {
                                    const totalMaquinas = prodRows[0].total || 0;
                                    comissoes = totalMaquinas * (func.comissao_maquina_producao || 0);
                                }
                            });
                        }
                    }
                    
                    // Buscar vales pendentes do funcionário para o mês e quinzena
                    db.all("SELECT COALESCE(SUM(valor), 0) as total FROM vales WHERE id_funcionario = ? AND mes_referencia = ? AND quinzena = ? AND status = 'pendente'", [func.id, mes_referencia, quinzena], (valesErr, valesRows) => {
                        if (!valesErr && valesRows && valesRows.length > 0) {
                            const totalVales = valesRows[0].total || 0;
                            
                            // Calcular total (salário + comissões - descontos)
                            const total = salarioBase + comissoes - totalVales - (outros_descontos || 0);
                            
                            // Inserir folha de pagamento
                            const sql = 'INSERT INTO folha_pagamento (id_funcionario, mes_referencia, quinzena, salario_base, comissoes, bonus, vales, outros_descontos, total, detalhe_comissoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
                            const params = [func.id, mes_referencia, quinzena, salarioBase, comissoes, bonus, totalVales, outros_descontos || 0, total, null];
                            
                            db.run(sql, params, function(err) {
                                if (err) {
                                    console.error('Erro ao inserir folha de pagamento:', err);
                                    return res.status(500).json({ error: err.message });
                                }
                                
                                folhasGeradas.push({
                                    id: this.lastID,
                                    id_funcionario: func.id,
                                    mes_referencia,
                                    quinzena,
                                    salario_base: salarioBase,
                                    comissoes,
                                    bonus,
                                    vales: totalVales,
                                    outros_descontos: outros_descontos || 0,
                                    total,
                                    detalhe_comissoes: null,
                                    nome_funcionario: func.nome,
                                    tipo: func.tipo
                                });
                            });
                        }
                    });
                }
                
                res.json(folhasGeradas);
            });
        }
    } catch (error) {
        console.error('Erro geral:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST folha-pagamento
app.post('/api/folha-pagamento', async (req, res) => {
    console.log('=== POST /api/folha-pagamento ===');
    console.log('Dados recebidos:', req.body);
    
    try {
        const { id_funcionario, mes_referencia, salario_base, comissoes, bonus, total, detalhe_comissoes } = req.body;
        
        // Validação básica
        if (!id_funcionario || !mes_referencia || salario_base === undefined || comissoes === undefined || bonus === undefined || total === undefined) {
            console.log('Erro: Campos obrigatórios faltando');
            return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
        }
        
        if (useSupabase) {
            // Usar PostgreSQL direto
            console.log('Inserindo folha de pagamento no PostgreSQL...');
            const { Client } = require('pg');
            
            try {
                // Usar o endpoint correto do pooler
                const poolerUrl = databaseUrl.replace(
                    'postgresql://postgres:tiVW2cmpeVStByLm@db.yuwddqxdnyjvilbmjooc.supabase.co:5432/postgres',
                    'postgresql://postgres.yuwddqxdnyjvilbmjooc:tiVW2cmpeVStByLm@aws-1-sa-east-1.pooler.supabase.com:6543/postgres'
                );
                
                const client = new Client({
                    connectionString: poolerUrl,
                    ssl: { rejectUnauthorized: false },
                    connectionTimeoutMillis: 10000,
                    query_timeout: 10000
                });
                
                await client.connect();
                
                // Verificar se funcionário existe e está ativo
                const funcResult = await client.query('SELECT id, nome, ativo FROM funcionarios WHERE id = $1', [id_funcionario]);
                
                if (funcResult.rows.length === 0) {
                    console.error('Funcionário não encontrado:', id_funcionario);
                    await client.end();
                    return res.status(400).json({ error: 'Funcionário não encontrado' });
                }
                
                if (!funcResult.rows[0].ativo) {
                    console.error('Funcionário está inativo:', id_funcionario);
                    await client.end();
                    return res.status(400).json({ error: 'Funcionário está inativo' });
                }
                
                // Buscar vales pendentes do funcionário para o mês (independente da quinzena, pois vendedoras recebem tudo no dia 30)
                const valesResult = await client.query(
                    "SELECT COALESCE(SUM(valor), 0) as total FROM vales WHERE id_funcionario = $1 AND mes_referencia = $2 AND status = 'pendente'",
                    [id_funcionario, mes_referencia]
                );
                
                const totalVales = valesResult.rows[0].total || 0;
                
                // Calcular total atualizado (salário + comissões + bonus - vales)
                const totalAtualizado = salario_base + comissoes + bonus - totalVales;
                
                // Inserir folha de pagamento
                const result = await client.query(
                    `INSERT INTO folha_pagamento (id_funcionario, mes_referencia, quinzena, salario_base, comissoes, bonus, vales, outros_descontos, total, detalhe_comissoes) 
                     VALUES ($1, $2, 'mensal', $3, $4, $5, $6, 0, $7, $8) RETURNING *`,
                    [id_funcionario, mes_referencia, salario_base, comissoes, bonus, totalVales, totalAtualizado, detalhe_comissoes || null]
                );
                
                console.log('Folha de pagamento inserida no PostgreSQL:', result.rows[0]);
                await client.end();
                
                // Adicionar nome do funcionário na resposta
                const folhaResponse = {
                    ...result.rows[0],
                    nome_funcionario: funcResult.rows[0].nome
                };
                
                res.json(folhaResponse);
                
            } catch (pgError) {
                console.log('PostgreSQL falhou, usando SQLite fallback:', pgError.message);
                
                // Fallback para SQLite
                db.get('SELECT id, nome, ativo FROM funcionarios WHERE id = ?', [id_funcionario], (err, row) => {
                    if (err) {
                        console.error('Erro ao verificar funcionário:', err);
                        return res.status(500).json({ error: err.message });
                    }
                    
                    if (!row) {
                        console.error('Funcionário não encontrado:', id_funcionario);
                        return res.status(400).json({ error: 'Funcionário não encontrado' });
                    }
                    
                    if (!row.ativo) {
                        console.error('Funcionário está inativo:', id_funcionario);
                        return res.status(400).json({ error: 'Funcionário está inativo' });
                    }
                    
                    // Buscar vales pendentes do funcionário para o mês (independente da quinzena, pois vendedoras recebem tudo no dia 30)
                    db.all("SELECT COALESCE(SUM(valor), 0) as total FROM vales WHERE id_funcionario = ? AND mes_referencia = ? AND status = 'pendente'", [id_funcionario, mes_referencia], (valesErr, valesRows) => {
                        if (valesErr) {
                            console.error('Erro ao buscar vales:', valesErr);
                            return res.status(500).json({ error: valesErr.message });
                        }
                        
                        const totalVales = valesRows && valesRows.length > 0 ? (valesRows[0].total || 0) : 0;
                        
                        // Calcular total atualizado (salário + comissões + bonus - vales)
                        const totalAtualizado = salario_base + comissoes + bonus - totalVales;
                        
                        // Inserir folha de pagamento
                        const sql = 'INSERT INTO folha_pagamento (id_funcionario, mes_referencia, quinzena, salario_base, comissoes, bonus, vales, outros_descontos, total, detalhe_comissoes) VALUES (?, ?, "mensal", ?, ?, ?, ?, 0, ?, ?)';
                        const params = [id_funcionario, mes_referencia, salario_base, comissoes, bonus, totalVales, totalAtualizado, detalhe_comissoes || null];
                        
                        db.run(sql, params, function(err) {
                            if (err) {
                                console.error('Erro ao inserir folha de pagamento:', err);
                                return res.status(500).json({ error: err.message });
                            }
                            console.log('Folha de pagamento inserida com ID:', this.lastID);
                            res.json({ 
                                id: this.lastID, 
                                id_funcionario, 
                                mes_referencia,
                                quinzena: 'mensal',
                                salario_base, 
                                comissoes, 
                                bonus,
                                vales: totalVales,
                                outros_descontos: 0,
                                total: totalAtualizado,
                                detalhe_comissoes: detalhe_comissoes || null,
                                nome_funcionario: row.nome
                            });
                        });
                    });
                });
            }
        } else {
            // Usar SQLite local
            db.get('SELECT id, nome, ativo FROM funcionarios WHERE id = ?', [id_funcionario], (err, row) => {
                if (err) {
                    console.error('Erro ao verificar funcionário:', err);
                    return res.status(500).json({ error: err.message });
                }
                
                if (!row) {
                    console.error('Funcionário não encontrado:', id_funcionario);
                    return res.status(400).json({ error: 'Funcionário não encontrado' });
                }
                
                if (!row.ativo) {
                    console.error('Funcionário está inativo:', id_funcionario);
                    return res.status(400).json({ error: 'Funcionário está inativo' });
                }
                
                // Buscar vales pendentes do funcionário para o mês (independente da quinzena, pois vendedoras recebem tudo no dia 30)
                db.all("SELECT COALESCE(SUM(valor), 0) as total FROM vales WHERE id_funcionario = ? AND mes_referencia = ? AND status = 'pendente'", [id_funcionario, mes_referencia], (valesErr, valesRows) => {
                    if (valesErr) {
                        console.error('Erro ao buscar vales:', valesErr);
                        return res.status(500).json({ error: valesErr.message });
                    }
                    
                    const totalVales = valesRows && valesRows.length > 0 ? (valesRows[0].total || 0) : 0;
                    
                    // Calcular total atualizado (salário + comissões + bonus - vales)
                    const totalAtualizado = salario_base + comissoes + bonus - totalVales;
                    
                    // Inserir folha de pagamento
                    const sql = 'INSERT INTO folha_pagamento (id_funcionario, mes_referencia, quinzena, salario_base, comissoes, bonus, vales, outros_descontos, total, detalhe_comissoes) VALUES (?, ?, "mensal", ?, ?, ?, ?, 0, ?, ?)';
                    const params = [id_funcionario, mes_referencia, salario_base, comissoes, bonus, totalVales, totalAtualizado, detalhe_comissoes || null];
                    
                    db.run(sql, params, function(err) {
                        if (err) {
                            console.error('Erro ao inserir folha de pagamento:', err);
                            return res.status(500).json({ error: err.message });
                        }
                        console.log('Folha de pagamento inserida com ID:', this.lastID);
                        res.json({ 
                            id: this.lastID, 
                            id_funcionario, 
                            mes_referencia,
                            quinzena: 'mensal',
                            salario_base, 
                            comissoes, 
                            bonus,
                            vales: totalVales,
                            outros_descontos: 0,
                            total: totalAtualizado,
                            detalhe_comissoes: detalhe_comissoes || null,
                            nome_funcionario: row.nome
                        });
                    });
                });
            });
        }
    } catch (error) {
        console.error('Erro geral:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE folha-pagamento
app.delete('/api/folha-pagamento/:mes', async (req, res) => {
    console.log('=== DELETE /api/folha-pagamento/:mes ===');
    console.log('Mês:', req.params.mes);
    
    try {
        const { mes } = req.params;
        
        if (useSupabase) {
            // Usar PostgreSQL direto
            console.log('Excluindo folha de pagamento no PostgreSQL...');
            const { Client } = require('pg');
            
            try {
                const poolerUrl = databaseUrl.replace(
                    'postgresql://postgres:tiVW2cmpeVStByLm@db.yuwddqxdnyjvilbmjooc.supabase.co:5432/postgres',
                    'postgresql://postgres.yuwddqxdnyjvilbmjooc:tiVW2cmpeVStByLm@aws-1-sa-east-1.pooler.supabase.com:6543/postgres'
                );
                
                const client = new Client({
                    connectionString: poolerUrl,
                    ssl: { rejectUnauthorized: false },
                    connectionTimeoutMillis: 10000,
                    query_timeout: 10000
                });
                
                await client.connect();
                
                const result = await client.query('DELETE FROM folha_pagamento WHERE mes_referencia = $1 RETURNING *', [mes]);
                
                console.log('Folha de pagamento excluída no PostgreSQL:', result.rows.length, 'registros');
                await client.end();
                
                res.json({ message: 'Folha de pagamento excluída com sucesso!' });
                
            } catch (pgError) {
                console.log('PostgreSQL falhou, usando SQLite fallback:', pgError.message);
                
                // Fallback para SQLite
                db.run('DELETE FROM folha_pagamento WHERE mes_referencia = ?', [mes], function(err) {
                    if (err) {
                        console.error('Erro ao excluir folha de pagamento:', err);
                        return res.status(500).json({ error: err.message });
                    }
                    console.log('Folha de pagamento excluída para o mês:', mes);
                    res.json({ message: 'Folha de pagamento excluída com sucesso!' });
                });
            }
        } else {
            // Usar SQLite local
            db.run('DELETE FROM folha_pagamento WHERE mes_referencia = ?', [mes], function(err) {
                if (err) {
                    console.error('Erro ao excluir folha de pagamento:', err);
                    return res.status(500).json({ error: err.message });
                }
                console.log('Folha de pagamento excluída para o mês:', mes);
                res.json({ message: 'Folha de pagamento excluída com sucesso!' });
            });
        }
    } catch (error) {
        console.error('Erro geral:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST gerar folha de pagamento para um mês
app.post('/api/gerar-folha/:mes', async (req, res) => {
    console.log('=== POST /api/gerar-folha/:mes ===');
    console.log('Mês:', req.params.mes);
    
    try {
        const { mes } = req.params;
        
        if (!mes || !/^\d{4}-\d{2}$/.test(mes)) {
            return res.status(400).json({ error: 'Formato de mês inválido. Use YYYY-MM' });
        }
        
        if (useSupabase) {
            // Usar PostgreSQL direto
            console.log('Gerando folha de pagamento no PostgreSQL...');
            const { Client } = require('pg');
            
            try {
                // Usar o endpoint correto do pooler
                const poolerUrl = databaseUrl.replace(
                    'postgresql://postgres:tiVW2cmpeVStByLm@db.yuwddqxdnyjvilbmjooc.supabase.co:5432/postgres',
                    'postgresql://postgres.yuwddqxdnyjvilbmjooc:tiVW2cmpeVStByLm@aws-1-sa-east-1.pooler.supabase.com:6543/postgres'
                );
                
                const client = new Client({
                    connectionString: poolerUrl,
                    ssl: { rejectUnauthorized: false },
                    connectionTimeoutMillis: 10000,
                    query_timeout: 10000
                });
                
                await client.connect();
                
                // Buscar todos os funcionários ativos
                const funcResult = await client.query('SELECT * FROM funcionarios WHERE ativo = true ORDER BY nome');
                const funcionarios = funcResult.rows;
                
                console.log('Funcionários ativos encontrados:', funcionarios.length);
                
                // Para cada funcionário, calcular a folha de pagamento
                const folhaGerada = [];
                
                for (const func of funcionarios) {
                    console.log('Calculando folha para:', func.nome, 'Tipo:', func.tipo);
                    
                    let salarioBase = 0;
                    let comissoes = 0;
                    let bonus = 0;
                    let detalheComissoes = null;
                    
                    if (func.tipo === 'vendedora') {
                        // Buscar vendas do mês para esta vendedora
                        const vendasResult = await client.query(
                            `SELECT * FROM vendas 
                             WHERE id_funcionario = $1 AND TO_CHAR(data_venda, 'YYYY-MM') = $2`,
                            [func.id, mes]
                        );
                        const vendas = vendasResult.rows;
                        
                        console.log('Vendas encontradas para', func.nome, ':', vendas.length);
                        
                        // Calcular comissões
                        let qtdGrandeSemDesconto = 0;
                        let qtdGrandeComDesconto = 0;
                        let qtdPequenaSemDesconto = 0;
                        let qtdPequenaComDesconto = 0;
                        
                        for (const venda of vendas) {
                            if (venda.tipo_maquina === 'grande') {
                                if (venda.com_desconto) {
                                    qtdGrandeComDesconto += venda.quantidade_maquinas;
                                } else {
                                    qtdGrandeSemDesconto += venda.quantidade_maquinas;
                                }
                            } else if (venda.tipo_maquina === 'pequena') {
                                if (venda.com_desconto) {
                                    qtdPequenaComDesconto += venda.quantidade_maquinas;
                                } else {
                                    qtdPequenaSemDesconto += venda.quantidade_maquinas;
                                }
                            }
                        }
                        
                        // Calcular valores (sem desconto ganha 100 a mais, com desconto ganha base)
                        const valorGrandeSemDesconto = qtdGrandeSemDesconto * (func.comissao_maquina_grande + func.comissao_extra_desconto);
                        const valorGrandeComDesconto = qtdGrandeComDesconto * func.comissao_maquina_grande;
                        const valorPequenaSemDesconto = qtdPequenaSemDesconto * (func.comissao_maquina_pequena + func.comissao_extra_desconto);
                        const valorPequenaComDesconto = qtdPequenaComDesconto * func.comissao_maquina_pequena;
                        
                        comissoes = valorGrandeSemDesconto + valorGrandeComDesconto + valorPequenaSemDesconto + valorPequenaComDesconto;
                        
                        // Verificar meta e calcular prêmio/bônus
                        const totalMaquinas = qtdGrandeSemDesconto + qtdGrandeComDesconto + qtdPequenaSemDesconto + qtdPequenaComDesconto;
                        if (totalMaquinas >= func.meta_maquinas) {
                            const vezesBateuMeta = Math.floor(totalMaquinas / func.meta_maquinas);
                            const premioTotal = vezesBateuMeta * (func.premio_meta || 1000);
                            const bonusTotal = func.bonus_meta || 1000;
                            bonus = premioTotal + bonusTotal;
                            console.log(`Meta batida! Total máquinas: ${totalMaquinas}, Vezes: ${vezesBateuMeta}, Prêmio: ${premioTotal}, Bônus: ${bonusTotal}, Total: ${bonus}`);
                        }
                        
                        // Detalhamento das comissões
                        detalheComissoes = JSON.stringify({
                            qtd_grande_sem_desconto: qtdGrandeSemDesconto,
                            valor_grande_sem_desconto: valorGrandeSemDesconto,
                            qtd_grande_com_desconto: qtdGrandeComDesconto,
                            valor_grande_com_desconto: valorGrandeComDesconto,
                            qtd_pequena_sem_desconto: qtdPequenaSemDesconto,
                            valor_pequena_sem_desconto: valorPequenaSemDesconto,
                            qtd_pequena_com_desconto: qtdPequenaComDesconto,
                            valor_pequena_com_desconto: valorPequenaComDesconto
                        });
                        
                    } else if (func.tipo === 'producao') {
                        // Buscar produção do mês para este funcionário
                        console.log('Buscando produção para', func.nome, 'no mês', mes);
                        const prodResult = await client.query(
                            `SELECT SUM(maquinas_produzidas) as total, COUNT(*) as registros
                             FROM producao 
                             WHERE id_funcionario = $1 AND TO_CHAR(data_producao, 'YYYY-MM') = $2`,
                            [func.id, mes]
                        );
                        
                        const totalProduzido = prodResult.rows[0]?.total || 0;
                        const registrosEncontrados = prodResult.rows[0]?.registros || 0;
                        console.log('Produção encontrada para', func.nome, ':', totalProduzido, 'registros:', registrosEncontrados);
                        
                        // Debug: mostrar todas as produções deste funcionário
                        const allProdResult = await client.query(
                            `SELECT maquinas_produzidas, data_producao, TO_CHAR(data_producao, 'YYYY-MM') as mes_formatado
                             FROM producao 
                             WHERE id_funcionario = $1
                             ORDER BY data_producao DESC`,
                            [func.id]
                        );
                        console.log('Todas as produções de', func.nome, ':', allProdResult.rows);
                        
                        salarioBase = func.salario_base;
                        comissoes = totalProduzido * func.comissao_maquina_producao;
                    }
                    
                    const total = salarioBase + comissoes + bonus;
                    
                    // Verificar se já existe folha para este funcionário e mês
                    const existeFolha = await client.query(
                        'SELECT id FROM folha_pagamento WHERE id_funcionario = $1 AND mes_referencia = $2',
                        [func.id, mes]
                    );
                    
                    if (existeFolha.rows.length > 0) {
                        // Atualizar folha existente
                        await client.query(
                            `UPDATE folha_pagamento SET 
                             salario_base = $1, comissoes = $2, bonus = $3, total = $4, detalhe_comissoes = $5
                             WHERE id_funcionario = $6 AND mes_referencia = $7`,
                            [salarioBase, comissoes, bonus, total, detalheComissoes, func.id, mes]
                        );
                        console.log('Folha atualizada para:', func.nome);
                    } else {
                        // Inserir nova folha
                        await client.query(
                            `INSERT INTO folha_pagamento 
                             (id_funcionario, mes_referencia, salario_base, comissoes, bonus, total, detalhe_comissoes, data_geracao) 
                             VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE)`,
                            [func.id, mes, salarioBase, comissoes, bonus, total, detalheComissoes]
                        );
                        console.log('Folha inserida para:', func.nome);
                    }
                    
                    folhaGerada.push({
                        id_funcionario: func.id,
                        nome_funcionario: func.nome,
                        tipo: func.tipo,
                        mes_referencia: mes,
                        salario_base: salarioBase,
                        comissoes: comissoes,
                        bonus: bonus,
                        total: total,
                        detalhe_comissoes: detalheComissoes,
                        data_geracao: new Date().toISOString().split('T')[0]
                    });
                }
                
                await client.end();
                
                console.log('Folha de pagamento gerada com sucesso!');
                res.json({ 
                    message: 'Folha de pagamento gerada com sucesso!',
                    folha: folhaGerada,
                    total_funcionarios: folhaGerada.length
                });
                
            } catch (pgError) {
                console.log('PostgreSQL falhou:', pgError.message);
                res.status(500).json({ error: pgError.message });
            }
        } else {
            // Usar SQLite local
            console.log('Usando SQLite local para gerar folha...');
            res.status(501).json({ error: 'Geração de folha não implementada para SQLite local' });
        }
    } catch (error) {
        console.error('Erro geral:', error);
        res.status(500).json({ error: error.message });
    }
});

// Iniciar servidor
app.listen(PORT, async () => {
    console.log(`Servidor ERP rodando em http://localhost:${PORT}`);
    
    // Criar tabelas no Supabase se estiver usando
    await createSupabaseTables();
    
    console.log('Endpoints disponíveis:');
    console.log('- GET /api/funcionarios');
    console.log('- POST /api/funcionarios');
    console.log('- GET /api/vendas');
    console.log('- POST /api/vendas');
});
