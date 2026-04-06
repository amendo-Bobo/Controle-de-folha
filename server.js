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
                    tipo TEXT NOT NULL CHECK(tipo IN ('vendedora', 'producao')),
                    comissao_maquina_grande REAL DEFAULT 450,
                    comissao_maquina_pequena REAL DEFAULT 250,
                    comissao_extra_desconto REAL DEFAULT 100,
                    salario_base REAL DEFAULT 0,
                    comissao_maquina_producao REAL DEFAULT 100,
                    meta_maquinas INTEGER DEFAULT 10,
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
                    com_desconto BOOLEAN DEFAULT true,
                    data_venda DATE NOT NULL
                )
            `);
            
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
            FOREIGN KEY (id_funcionario) REFERENCES funcionarios(id)
        )`);
        
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
                     comissao_extra_desconto, salario_base, comissao_maquina_producao, meta_maquinas, bonus_meta, ativo) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true) 
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
                        Number(bonus_meta) || 1000
                    ]
                );
                
                console.log('Funcionário inserido no PostgreSQL:', result.rows[0]);
                
                await client.end();
                
                res.json(result.rows[0]);
            } catch (pgError) {
                console.log('PostgreSQL falhou, usando SQLite fallback:', pgError.message);
                
                // Fallback para SQLite
                const sql = 'INSERT INTO funcionarios (nome, tipo, comissao_maquina_grande, comissao_maquina_pequena, comissao_extra_desconto, salario_base, comissao_maquina_producao, meta_maquinas, bonus_meta) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
                const params = [
                    nome, 
                    tipo, 
                    Number(comissao_maquina_grande) || 450, 
                    Number(comissao_maquina_pequena) || 250, 
                    Number(comissao_extra_desconto) || 100,
                    Number(salario_base) || 0, 
                    Number(comissao_maquina_producao) || 100,
                    Number(meta_maquinas) || 10,
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
            const sql = 'INSERT INTO funcionarios (nome, tipo, comissao_maquina_grande, comissao_maquina_pequena, comissao_extra_desconto, salario_base, comissao_maquina_producao, meta_maquinas, bonus_meta) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
            const params = [
                nome, 
                tipo, 
                Number(comissao_maquina_grande) || 450, 
                Number(comissao_maquina_pequena) || 250, 
                Number(comissao_extra_desconto) || 100,
                Number(salario_base) || 0, 
                Number(comissao_maquina_producao) || 100,
                Number(meta_maquinas) || 10,
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

// POST vendas
app.post('/api/vendas', (req, res) => {
    console.log('=== POST /api/vendas ===');
    console.log('Dados recebidos:', req.body);
    
    try {
        const { id_funcionario, tipo_maquina, quantidade_maquinas, com_desconto, data_venda } = req.body;
        
        // Validação básica
        if (!id_funcionario || !tipo_maquina || !quantidade_maquinas || !data_venda) {
            console.log('Erro: Campos obrigatórios faltando');
            return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
        }
        
        // Verificar se funcionário existe
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
            const sql = 'INSERT INTO vendas (id_funcionario, tipo_maquina, quantidade_maquinas, com_desconto, data_venda) VALUES (?, ?, ?, ?, ?)';
            const params = [id_funcionario, tipo_maquina, quantidade_maquinas, com_desconto, data_venda];
            
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
                    data_venda
                });
            });
        });
    } catch (error) {
        console.error('Erro geral:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET vendas
app.get('/api/vendas', (req, res) => {
    const query = `
        SELECT v.*, f.nome as nome_funcionario 
        FROM vendas v 
        JOIN funcionarios f ON v.id_funcionario = f.id 
        WHERE f.ativo = 1
        ORDER BY v.data_venda DESC
    `;
    
    db.all(query, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
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
