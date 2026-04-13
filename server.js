const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
// require('dotenv').config(); // Comentado para teste local

// Importar Supabase (comentado para teste local)
// const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('Iniciando servidor...');

// Configurar Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://gbnibcoshpgwzqkkugsb.supabase.co';
const supabaseKey = process.env.SUPABASE_PASSWORD || 'sua-senha-aqui';

// Usar Supabase se estiver configurado no Render, senão SQLite local
const useSupabase = process.env.USE_SUPABASE === 'true';

console.log('useSupabase:', useSupabase);
if (useSupabase) {
    console.log('Usando Supabase (PostgreSQL)');
} else {
    console.log('Usando SQLite local');
}

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
            'postgresql://postgres:sua-senha-aqui@db.gbnibcoshpgwzqkkugsb.supabase.co:5432/postgres',
            'postgresql://postgres.gbnibcoshpgwzqkkugsb:sua-senha-aqui@aws-1-sa-east-1.pooler.supabase.com:6543/postgres'
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
                    tipo TEXT NOT NULL CHECK(tipo IN ('vendedora', 'producao')),
                    comissao_maquina_grande REAL DEFAULT 450,
                    comissao_maquina_pequena REAL DEFAULT 250,
                    comissao_extra_desconto REAL DEFAULT 100,
                    salario_base REAL DEFAULT 0,
                    comissao_maquina_producao REAL DEFAULT 100,
                    meta_maquinas INTEGER DEFAULT 10,
                    premio_meta REAL DEFAULT 1000,
                    bonus_meta REAL DEFAULT 1000,
                    ativo BOOLEAN DEFAULT true
                )
            `);
            
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
                    salario_base REAL NOT NULL DEFAULT 0,
                    comissoes REAL NOT NULL DEFAULT 0,
                    bonus REAL NOT NULL DEFAULT 0,
                    total REAL NOT NULL DEFAULT 0,
                    data_geracao DATE DEFAULT CURRENT_DATE NOT NULL,
                    detalhe_comissoes TEXT,
                    ajustes TEXT,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            `);
            console.log('Tabela folha_pagamento recriada com estrutura correta');
            
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
            tipo TEXT NOT NULL CHECK(tipo IN ('vendedora', 'producao')),
            comissao_maquina_grande REAL DEFAULT 450,
            comissao_maquina_pequena REAL DEFAULT 250,
            comissao_extra_desconto REAL DEFAULT 100,
            salario_base REAL DEFAULT 0,
            comissao_maquina_producao REAL DEFAULT 100,
            meta_maquinas INTEGER DEFAULT 10,
            premio_meta REAL DEFAULT 1000,
            bonus_meta REAL DEFAULT 1000,
            ativo BOOLEAN DEFAULT 1
        )`);
        
        console.log('Tabela funcionarios criada com sucesso');

        // Tabela vendas
        db.run(`CREATE TABLE IF NOT EXISTS vendas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_funcionario INTEGER NOT NULL,
            tipo_maquina TEXT NOT NULL CHECK(tipo_maquina IN ('grande', 'pequena')),
            quantidade_maquinas INTEGER NOT NULL,
            com_desconto BOOLEAN DEFAULT 1,
            data_venda DATE NOT NULL,
            mes TEXT,
            FOREIGN KEY (id_funcionario) REFERENCES funcionarios(id)
        )`);
        
        // Adicionar coluna mes se não existir
        db.run(`ALTER TABLE vendas ADD COLUMN mes TEXT`, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error('Erro ao adicionar coluna mes:', err);
            } else {
                console.log('Coluna mes adicionada ou já existe na tabela vendas');
            }
        });
        
        console.log('Tabela vendas criada com sucesso');

        // Tabela producao
        db.run(`CREATE TABLE IF NOT EXISTS producao (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_funcionario INTEGER NOT NULL,
            maquinas_produzidas INTEGER NOT NULL,
            data_producao DATE NOT NULL,
            FOREIGN KEY (id_funcionario) REFERENCES funcionarios(id)
        )`);

        // Tabela folha_pagamento
        db.run(`CREATE TABLE IF NOT EXISTS folha_pagamento (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_funcionario INTEGER NOT NULL,
            mes_referencia TEXT NOT NULL,
            salario_base REAL NOT NULL,
            comissoes REAL NOT NULL,
            bonus REAL NOT NULL,
            total REAL NOT NULL,
            data_geracao DATE NOT NULL,
            detalhe_comissoes TEXT,
            FOREIGN KEY (id_funcionario) REFERENCES funcionarios(id)
        )`);

        // Adicionar coluna detalhe_comissoes se não existir
        db.run(`ALTER TABLE folha_pagamento ADD COLUMN detalhe_comissoes TEXT`, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.log('Coluna detalhe_comissoes já existe ou erro:', err.message);
            }
        });

        console.log('Todas as tabelas criadas com sucesso!');
    });
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

// GET funcionario por ID
app.get('/api/funcionarios/:id', async (req, res) => {
    console.log('=== GET /api/funcionarios/:id chamado ===');
    console.log('ID:', req.params.id);
    console.log('useSupabase:', useSupabase);
    
    if (useSupabase) {
        // Usar PostgreSQL direto
        console.log('Buscando funcionário no PostgreSQL...');
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
            
            const result = await client.query('SELECT * FROM funcionarios WHERE id = $1', [req.params.id]);
            
            console.log('Funcionário encontrado no PostgreSQL:', result.rows.length);
            
            await client.end();
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Funcionário não encontrado' });
            }
            
            res.json(result.rows[0]);
            
        } catch (error) {
            console.log('Erro no PostgreSQL, usando SQLite fallback:', error.message);
            
            // Fallback para SQLite
            db.get('SELECT * FROM funcionarios WHERE id = ?', [req.params.id], (err, row) => {
                if (err) {
                    console.error('Erro no SQLite fallback:', err);
                    return res.status(500).json({ error: err.message });
                }
                if (!row) {
                    return res.status(404).json({ error: 'Funcionário não encontrado' });
                }
                res.json(row);
            });
        }
    } else {
        // Usar SQLite local
        console.log('Usando SQLite local...');
        db.get('SELECT * FROM funcionarios WHERE id = ?', [req.params.id], (err, row) => {
            if (err) {
                console.error('Erro no SQLite local:', err);
                return res.status(500).json({ error: err.message });
            }
            if (!row) {
                console.log('Funcionário não encontrado no SQLite local');
                return res.status(404).json({ error: 'Funcionário não encontrado' });
            }
            console.log('Funcionário encontrado no SQLite local:', row.nome);
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
            bonus_meta
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
                     comissao_extra_desconto, salario_base, comissao_maquina_producao, meta_maquinas, premio_meta, bonus_meta, ativo) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true) 
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
                        Number(bonus_meta) || 1000
                    ]
                );
                
                console.log('Funcionário inserido no PostgreSQL:', result.rows[0]);
                
                await client.end();
                
                res.json(result.rows[0]);
            } catch (pgError) {
                console.log('PostgreSQL falhou, usando SQLite fallback:', pgError.message);
                
                // Fallback para SQLite
                const sql = 'INSERT INTO funcionarios (nome, tipo, comissao_maquina_grande, comissao_maquina_pequena, comissao_extra_desconto, salario_base, comissao_maquina_producao, meta_maquinas, premio_meta, bonus_meta) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
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
                    Number(bonus_meta) || 1000
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
                        bonus_meta: Number(bonus_meta) || 1000,
                        ativo: true
                    });
                });
            }
        } else {
            // Usar SQLite local
            const sql = 'INSERT INTO funcionarios (nome, tipo, comissao_maquina_grande, comissao_maquina_pequena, comissao_extra_desconto, salario_base, comissao_maquina_producao, meta_maquinas, premio_meta, bonus_meta) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
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
                Number(bonus_meta) || 1000
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
                    bonus_meta: Number(bonus_meta) || 1000,
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
            bonus_meta
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
                     meta_maquinas = $8, premio_meta = $9, bonus_meta = $10, updated_at = NOW()
                     WHERE id = $11 RETURNING *`,
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
                meta_maquinas = ?, premio_meta = ?, bonus_meta = ?
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
                    bonus_meta: Number(bonus_meta) || 1000,
                    ativo: true
                });
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
        const { id_funcionario, tipo_maquina, quantidade_maquinas, com_desconto, data_venda, mes } = req.body;
        console.log('Dados extraídos:', { id_funcionario, tipo_maquina, quantidade_maquinas, com_desconto, data_venda, mes });
        
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
                     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                    [id_funcionario, tipo_maquina, quantidade_maquinas, com_desconto, data_venda, mes]
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
                            mes,
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
                        mes,
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
        const { id_funcionario, maquinas_produzidas, data_producao } = req.body;
        
        // Validação básica
        if (!id_funcionario || !maquinas_produzidas || !data_producao) {
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
                    `INSERT INTO producao (id_funcionario, maquinas_produzidas, data_producao) 
                     VALUES ($1, $2, $3) RETURNING *`,
                    [id_funcionario, maquinas_produzidas, data_producao]
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
            SELECT fp.*, f.nome as nome_funcionario, f.tipo 
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
                
                // Inserir folha de pagamento
                const result = await client.query(
                    `INSERT INTO folha_pagamento (id_funcionario, mes_referencia, salario_base, comissoes, bonus, total, detalhe_comissoes) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
                    [id_funcionario, mes_referencia, salario_base, comissoes, bonus, total, detalhe_comissoes || null]
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
                    
                    // Inserir folha de pagamento
                    const sql = 'INSERT INTO folha_pagamento (id_funcionario, mes_referencia, salario_base, comissoes, bonus, total, detalhe_comissoes) VALUES (?, ?, ?, ?, ?, ?, ?)';
                    const params = [id_funcionario, mes_referencia, salario_base, comissoes, bonus, total, detalhe_comissoes || null];
                    
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
                            salario_base, 
                            comissoes, 
                            bonus, 
                            total,
                            detalhe_comissoes: detalhe_comissoes || null,
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
                
                // Inserir folha de pagamento
                const sql = 'INSERT INTO folha_pagamento (id_funcionario, mes_referencia, salario_base, comissoes, bonus, total, detalhe_comissoes) VALUES (?, ?, ?, ?, ?, ?, ?)';
                const params = [id_funcionario, mes_referencia, salario_base, comissoes, bonus, total, detalhe_comissoes || null];
                
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
                        salario_base, 
                        comissoes, 
                        bonus, 
                        total,
                        detalhe_comissoes: detalhe_comissoes || null,
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

// GET folha-pagamento por ID
app.get('/api/folha-pagamento/por-id/:id', async (req, res) => {
    console.log('=== GET /api/folha-pagamento/por-id/:id ===');
    console.log('ID:', req.params.id);
    console.log('useSupabase:', useSupabase);
    
    const { id } = req.params;
    
    if (useSupabase) {
        // Usar PostgreSQL direto
        console.log('Buscando folha de pagamento por ID no PostgreSQL...');
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
            
            const result = await client.query('SELECT * FROM folha_pagamento WHERE id = $1', [id]);
            
            console.log('Folha de pagamento encontrada por ID no PostgreSQL:', result.rows.length, 'registros');
            await client.end();
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Folha de pagamento não encontrada' });
            }
            
            res.json(result.rows[0]);
            
        } catch (pgError) {
            console.log('PostgreSQL falhou, usando SQLite fallback:', pgError.message);
            
            // Fallback para SQLite
            db.get('SELECT * FROM folha_pagamento WHERE id = ?', [id], (err, row) => {
                if (err) {
                    console.error('Erro ao buscar folha de pagamento por ID:', err);
                    return res.status(500).json({ error: err.message });
                }
                if (!row) {
                    return res.status(404).json({ error: 'Folha de pagamento não encontrada' });
                }
                res.json(row);
            });
        }
    } else {
        // SQLite
        db.get('SELECT * FROM folha_pagamento WHERE id = ?', [id], (err, row) => {
            if (err) {
                console.error('Erro ao buscar folha de pagamento por ID:', err);
                return res.status(500).json({ error: err.message });
            }
            if (!row) {
                return res.status(404).json({ error: 'Folha de pagamento não encontrada' });
            }
            res.json(row);
        });
    }
});

// PUT folha-pagamento (atualizar)
app.put('/api/folha-pagamento/:id', async (req, res) => {
    console.log('=== PUT /api/folha-pagamento/:id ===');
    console.log('ID:', req.params.id);
    console.log('Dados recebidos:', req.body);
    console.log('useSupabase:', useSupabase);
    
    const { id } = req.params;
    const { ajustes } = req.body;
    
    if (useSupabase) {
        // Usar PostgreSQL direto
        console.log('Atualizando folha de pagamento no PostgreSQL...');
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
                'UPDATE folha_pagamento SET ajustes = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
                [ajustes, id]
            );
            
            console.log('Folha de pagamento atualizada no PostgreSQL:', result.rows.length, 'registros');
            await client.end();
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Folha de pagamento não encontrada' });
            }
            
            res.json(result.rows[0]);
            
        } catch (pgError) {
            console.log('PostgreSQL falhou, usando SQLite fallback:', pgError.message);
            
            // Fallback para SQLite
            db.run('UPDATE folha_pagamento SET ajustes = ?, updated_at = datetime("now") WHERE id = ?', [ajustes, id], function(err) {
                if (err) {
                    console.error('Erro ao atualizar folha de pagamento:', err);
                    return res.status(500).json({ error: err.message });
                }
                console.log('Folha de pagamento atualizada para o ID:', id);
                res.json({ message: 'Folha de pagamento atualizada com sucesso!' });
            });
        }
    } else {
        // SQLite
        db.run('UPDATE folha_pagamento SET ajustes = ?, updated_at = datetime("now") WHERE id = ?', [ajustes, id], function(err) {
            if (err) {
                console.error('Erro ao atualizar folha de pagamento:', err);
                return res.status(500).json({ error: err.message });
            }
            console.log('Folha de pagamento atualizada para o ID:', id);
            res.json({ message: 'Folha de pagamento atualizada com sucesso!' });
        });
    }
});

// OPTIONS para CORS preflight
app.options('/api/folha-pagamento/:mes', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.sendStatus(200);
});

// DELETE folha-pagamento
app.delete('/api/folha-pagamento/:mes', async (req, res) => {
    console.log('=== DELETE /api/folha-pagamento/:mes ===');
    console.log('Mês:', req.params.mes);
    console.log('Headers:', req.headers);
    
    try {
        const { mes } = req.params;
        
        if (!mes || !/^\d{4}-\d{2}$/.test(mes)) {
            return res.status(400).json({ error: 'Formato de mês inválido. Use YYYY-MM' });
        }
        
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
                        
                        // Calcular valores
                        const valorGrandeSemDesconto = qtdGrandeSemDesconto * func.comissao_maquina_grande;
                        const valorGrandeComDesconto = qtdGrandeComDesconto * (func.comissao_maquina_grande - func.comissao_extra_desconto);
                        const valorPequenaSemDesconto = qtdPequenaSemDesconto * func.comissao_maquina_pequena;
                        const valorPequenaComDesconto = qtdPequenaComDesconto * (func.comissao_maquina_pequena - func.comissao_extra_desconto);
                        
                        comissoes = valorGrandeSemDesconto + valorGrandeComDesconto + valorPequenaSemDesconto + valorPequenaComDesconto;
                        
                        // Verificar meta
                        const totalMaquinas = qtdGrandeSemDesconto + qtdGrandeComDesconto + qtdPequenaSemDesconto + qtdPequenaComDesconto;
                        if (totalMaquinas >= func.meta_maquinas) {
                            // Prêmio por meta: a cada 10 máquinas vendidas, ganha o prêmio
                            const vezesBateuMeta = Math.floor(totalMaquinas / func.meta_maquinas);
                            const premioTotal = vezesBateuMeta * (func.premio_meta || 1000);
                            // Bônus por meta: ganha apenas uma vez quando bate a meta pela primeira vez
                            const bonusTotal = func.bonus_meta || 1000;
                            // Total = prêmio (multiplicado) + bônus (apenas uma vez)
                            bonus = premioTotal + bonusTotal;
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
            
            try {
                // Buscar funcionários ativos
                const funcionarios = await new Promise((resolve, reject) => {
                    db.all('SELECT * FROM funcionarios WHERE ativo = 1', (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    });
                });
                
                console.log('Funcionários encontrados:', funcionarios.length);
                
                // Buscar vendas do mês
                const vendas = await new Promise((resolve, reject) => {
                    const mesInicio = `${mes}-01`;
                    const mesFim = `${mes}-31`;
                    db.all('SELECT * FROM vendas WHERE data_venda BETWEEN ? AND ?', [mesInicio, mesFim], (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    });
                });
                
                console.log('Vendas encontradas:', vendas.length);
                
                // Buscar produção do mês
                const producao = await new Promise((resolve, reject) => {
                    const mesInicio = `${mes}-01`;
                    const mesFim = `${mes}-31`;
                    db.all('SELECT * FROM producao WHERE data_producao BETWEEN ? AND ?', [mesInicio, mesFim], (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    });
                });
                
                console.log('Produção encontrada:', producao.length);
                
                // Apagar folha existente do mês
                await new Promise((resolve, reject) => {
                    db.run('DELETE FROM folha_pagamento WHERE mes_referencia = ?', [mes], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
                
                // Gerar folha para cada funcionário
                const folhaGerada = [];
                
                for (const func of funcionarios) {
                    let salarioBase = func.salario_base || 0;
                    let comissoes = 0;
                    let bonus = 0;
                    
                    if (func.tipo === 'vendedora') {
                        // Calcular comissões de vendas
                        const vendasFuncionario = vendas.filter(v => v.id_funcionario === func.id);
                        vendasFuncionario.forEach(v => {
                            const valorMaquina = v.tipo_maquina === 'grande' ? func.comissao_maquina_grande : func.comissao_maquina_pequena;
                            comissoes += v.quantidade_maquinas * valorMaquina;
                        });
                        
                        // Calcular bônus por meta
                        const totalMaquinas = vendasFuncionario.reduce((sum, v) => sum + v.quantidade_maquinas, 0);
                        if (totalMaquinas >= (func.meta_maquinas || 10)) {
                            // Prêmio por meta: a cada 10 máquinas vendidas, ganha o prêmio
                            const vezesBateuMeta = Math.floor(totalMaquinas / (func.meta_maquinas || 10));
                            const premioTotal = vezesBateuMeta * (func.premio_meta || 1000);
                            // Bônus por meta: ganha apenas uma vez quando bate a meta pela primeira vez
                            const bonusTotal = func.bonus_meta || 1000;
                            // Total = prêmio (multiplicado) + bônus (apenas uma vez)
                            bonus = premioTotal + bonusTotal;
                        }
                    } else if (func.tipo === 'producao') {
                        // Calcular comissões de produção
                        const producaoFuncionario = producao.filter(p => p.id_funcionario === func.id);
                        const totalMaquinas = producaoFuncionario.reduce((sum, p) => sum + p.maquinas_produzidas, 0);
                        comissoes = totalMaquinas * (func.comissao_maquina_producao || 100);
                        
                        // Calcular bônus por meta
                        if (totalMaquinas >= (func.meta_maquinas || 10)) {
                            bonus = func.bonus_meta || 0;
                        }
                    }
                    
                    const total = salarioBase + comissoes + bonus;
                    
                    // Inserir folha
                    await new Promise((resolve, reject) => {
                        db.run(
                            'INSERT INTO folha_pagamento (id_funcionario, mes_referencia, salario_base, comissoes, bonus, total, data_geracao) VALUES (?, ?, ?, ?, ?, ?, ?)',
                            [func.id, mes, salarioBase, comissoes, bonus, total, new Date().toISOString().split('T')[0]],
                            (err) => {
                                if (err) reject(err);
                                else resolve();
                            }
                        );
                    });
                    
                    folhaGerada.push({
                        id_funcionario: func.id,
                        nome_funcionario: func.nome,
                        tipo: func.tipo,
                        mes_referencia: mes,
                        salario_base: salarioBase,
                        comissoes: comissoes,
                        bonus: bonus,
                        total: total,
                        data_geracao: new Date().toISOString().split('T')[0]
                    });
                }
                
                console.log('Folha de pagamento gerada com sucesso!');
                res.json({ 
                    message: 'Folha de pagamento gerada com sucesso!',
                    folha: folhaGerada,
                    total_funcionarios: folhaGerada.length
                });
                
            } catch (sqliteError) {
                console.error('Erro ao gerar folha no SQLite:', sqliteError);
                res.status(500).json({ error: sqliteError.message });
            }
        }
    } catch (error) {
        console.error('Erro geral:', error);
        res.status(500).json({ error: error.message });
    }
});

// Iniciar servidor
app.listen(PORT, async () => {
    console.log(`Servidor ERP rodando em http://localhost:${PORT}`);
    
    // Listar todas as rotas registradas
    console.log('\n=== ROTAS REGISTRADAS ===');
    app._router.stack.forEach((r) => {
        if (r.route && r.route.path) {
            console.log(`${Object.keys(r.route.methods).join(', ').toUpperCase()} ${r.route.path}`);
        }
    });
    console.log('========================\n');
    
    // Criar tabelas no Supabase se estiver usando
    await createSupabaseTables();
});
