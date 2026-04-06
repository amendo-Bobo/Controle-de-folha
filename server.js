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
const supabase = createClient(supabaseUrl, supabaseKey);

// Verificar se está usando Supabase
const useSupabase = process.env.DATABASE_URL && 
                   (process.env.DATABASE_URL.includes('supabase') || 
                    process.env.DATABASE_URL.includes('yuwddqxdnyjvilbmjooc') ||
                    process.env.DATABASE_URL.includes('db.yuwddqxdnyjvilbmjooc.supabase.co'));
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Configurada' : 'Não configurada');
console.log('Usando Supabase:', useSupabase);

// Função para criar tabelas no Supabase
async function createSupabaseTables() {
    // Forçar criação se tiver DATABASE_URL
    if (!process.env.DATABASE_URL) {
        console.log('DATABASE_URL não configurada, pulando criação de tabelas');
        return;
    }
    
    console.log('Tentando criar tabelas no Supabase...');
    
    try {
        // Usar endpoint de connection pooling (IPv4)
        const { Client } = require('pg');
        
        // Mudar para endpoint pooling que usa IPv4
        let databaseUrl = process.env.DATABASE_URL;
        databaseUrl = databaseUrl.replace('db.yuwddqxdnyjvilbmjooc.supabase.co', 'db.yuwddqxdnyjvilbmjooc-pool.supabase.co');
        
        const client = new Client({
            connectionString: databaseUrl,
            ssl: { rejectUnauthorized: false }
        });
        
        await client.connect();
        console.log('Conectado ao PostgreSQL');
        
        // Criar tabelas uma por uma
        const tables = [
            `CREATE TABLE IF NOT EXISTS funcionarios (
                id SERIAL PRIMARY KEY,
                nome TEXT NOT NULL,
                tipo TEXT NOT NULL CHECK(tipo IN ('vendedora', 'producao')),
                comissao_maquina_grande REAL DEFAULT 450,
                comissao_maquina_pequena REAL DEFAULT 250,
                comissao_extra_desconto REAL DEFAULT 100,
                salario_base REAL DEFAULT 0,
                comissao_maquina_producao REAL DEFAULT 100,
                meta_maquinas INTEGER DEFAULT 10,
                bonus_meta REAL DEFAULT 1000,
                ativo BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS vendas (
                id SERIAL PRIMARY KEY,
                id_funcionario INTEGER NOT NULL REFERENCES funcionarios(id),
                tipo_maquina TEXT NOT NULL CHECK(tipo_maquina IN ('grande', 'pequeno')),
                quantidade_maquinas INTEGER NOT NULL,
                com_desconto BOOLEAN DEFAULT true,
                data_venda DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS producao (
                id SERIAL PRIMARY KEY,
                id_funcionario INTEGER NOT NULL REFERENCES funcionarios(id),
                maquinas_produzidas INTEGER NOT NULL,
                data_producao DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS folha_pagamento (
                id SERIAL PRIMARY KEY,
                id_funcionario INTEGER NOT NULL REFERENCES funcionarios(id),
                mes_referencia TEXT NOT NULL,
                salario_base REAL NOT NULL,
                comissoes REAL NOT NULL,
                bonus REAL NOT NULL,
                total REAL NOT NULL,
                data_geracao DATE NOT NULL,
                detalhe_comissoes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`
        ];
        
        for (const sql of tables) {
            try {
                await client.query(sql);
                console.log('Tabela criada com sucesso');
            } catch (err) {
                console.log('Erro ao criar tabela (pode já existir):', err.message);
            }
        }
        
        // Verificar se tem dados e inserir exemplos
        const result = await client.query('SELECT COUNT(*) as count FROM funcionarios');
        if (parseInt(result.rows[0].count) === 0) {
            console.log('Inserindo dados de exemplo...');
            await client.query(`
                INSERT INTO funcionarios (nome, tipo) VALUES 
                ('Maria Silva', 'vendedora'),
                ('João Santos', 'producao'),
                ('Ana Costa', 'vendedora')
            `);
            console.log('Dados de exemplo inseridos!');
        }
        
        await client.end();
        console.log('Tabelas criadas com sucesso no Supabase!');
        
    } catch (error) {
        console.log('Erro ao configurar Supabase:', error.message);
        console.log('Detalhes do erro:', error);
    }
}

app.use(cors());
app.use(express.json());

// Rotas primeiro
app.get('/api/funcionarios', (req, res) => {
    db.all('SELECT * FROM funcionarios WHERE ativo = 1', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/funcionarios', (req, res) => {
    console.log('=== POST /api/funcionarios ===');
    console.log('Headers:', req.headers);
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
        
        console.log('Valores processados:', {
            nome, 
            tipo, 
            comissao_maquina_grande, 
            comissao_maquina_pequena, 
            comissao_extra_desconto,
            salario_base, 
            comissao_maquina_producao,
            meta_maquinas,
            bonus_meta
        });
        
        // Validação básica
        if (!nome || !tipo) {
            console.log('Erro: Campos obrigatórios faltando');
            return res.status(400).json({ error: 'Nome e tipo são obrigatórios' });
        }
        
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
        
        console.log('SQL:', sql);
        console.log('Params:', params);
        console.log('Número de parâmetros:', params.length);
        
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
                comissao_maquina_grande, 
                comissao_maquina_pequena, 
                comissao_extra_desconto,
                salario_base, 
                comissao_maquina_producao,
                meta_maquinas,
                bonus_meta
            });
        });
    } catch (error) {
        console.error('Erro geral:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint de vendas
app.post('/api/vendas', (req, res) => {
    console.log('=== POST /api/vendas RECEBIDA ===');
    console.log('Body completo:', JSON.stringify(req.body, null, 2));
    
    const { id_funcionario, tipo_maquina, quantidade_maquinas, com_desconto, data_venda } = req.body;
    
    console.log('ID do funcionário:', id_funcionario);
    console.log('Tipo da máquina:', tipo_maquina);
    console.log('Quantidade:', quantidade_maquinas);
    console.log('Com desconto:', com_desconto);
    console.log('Data:', data_venda);
    
    // Verificar se a tabela vendas existe e qual a estrutura
    console.log('Verificando estrutura da tabela vendas...');
    db.all("PRAGMA table_info(vendas)", (err, columns) => {
        if (err) {
            console.error('Erro ao verificar tabela vendas:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        
        console.log('Estrutura da tabela vendas:', columns);
        
        // Verificar se o funcionário existe
        console.log('Verificando se funcionário', id_funcionario, 'existe...');
        db.get('SELECT id, nome, ativo FROM funcionarios WHERE id = ?', [id_funcionario], (err, row) => {
            if (err) {
                console.error('Erro ao verificar funcionário:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            
            console.log('Resultado da consulta:', row);
            
            if (!row) {
                console.error('Funcionário não encontrado:', id_funcionario);
                res.status(400).json({ error: 'Funcionário não encontrado' });
                return;
            }
            
            if (!row.ativo) {
                console.error('Funcionário está inativo:', id_funcionario);
                res.status(400).json({ error: 'Funcionário está inativo' });
                return;
            }
            
            console.log('Funcionário encontrado:', row);
            
            try {
                db.run(
                    'INSERT INTO vendas (id_funcionario, tipo_maquina, quantidade_maquinas, com_desconto, data_venda) VALUES (?, ?, ?, ?, ?)',
                    [id_funcionario, tipo_maquina, quantidade_maquinas, com_desconto, data_venda],
                    function(err) {
                        if (err) {
                            console.error('Erro no banco:', err);
                            res.status(500).json({ error: err.message });
                            return;
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
                    }
                );
            } catch (error) {
                console.error('Erro geral:', error);
                res.status(500).json({ error: error.message });
            }
        });
    });
});

// Static files no final
app.use(express.static(path.join(__dirname, 'public')));

console.log('Conectando ao banco de dados...');
const db = new sqlite3.Database('./erp.db', (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco:', err.message);
        process.exit(1);
    }
    console.log('Banco de dados conectado com sucesso');
});

db.serialize(() => {
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

    // Forçar recriação da tabela vendas
    db.run('DROP TABLE IF EXISTS vendas');
    
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

    db.run(`CREATE TABLE IF NOT EXISTS producao (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_funcionario INTEGER NOT NULL,
        maquinas_produzidas INTEGER NOT NULL,
        data_producao DATE NOT NULL,
        FOREIGN KEY (id_funcionario) REFERENCES funcionarios(id)
    )`);

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
});

app.get('/api/funcionarios', (req, res) => {
    db.all('SELECT * FROM funcionarios WHERE ativo = 1', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/funcionarios', (req, res) => {
    console.log('=== POST /api/funcionarios ===');
    console.log('Headers:', req.headers);
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
        
        console.log('Valores processados:', {
            nome, 
            tipo, 
            comissao_maquina_grande, 
            comissao_maquina_pequena, 
            comissao_extra_desconto,
            salario_base, 
            comissao_maquina_producao,
            meta_maquinas,
            bonus_meta,
            bonus_meta_extra
        });
        
        // Validação básica
        if (!nome || !tipo) {
            console.log('Erro: Campos obrigatórios faltando');
            return res.status(400).json({ error: 'Nome e tipo são obrigatórios' });
        }
        
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
        
        console.log('SQL:', sql);
        console.log('Params:', params);
        console.log('Número de parâmetros:', params.length);
        
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
                comissao_maquina_grande, 
                comissao_maquina_pequena, 
                comissao_extra_desconto,
                salario_base, 
                comissao_maquina_producao,
                meta_maquinas,
                bonus_meta
            });
        });
    } catch (error) {
        console.error('Erro geral:', error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/funcionarios/:id/desativar', (req, res) => {
    const id = req.params.id;
    
    db.run(
        'UPDATE funcionarios SET ativo = 0 WHERE id = ?',
        [id],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ message: 'Funcionário desativado com sucesso' });
        }
    );
});

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

// Endpoint para buscar venda por ID
app.get('/api/vendas/:id', (req, res) => {
    const id = req.params.id;
    
    const query = `
        SELECT v.*, f.nome as nome_funcionario 
        FROM vendas v 
        JOIN funcionarios f ON v.id_funcionario = f.id 
        WHERE v.id = ?
    `;
    
    db.get(query, [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (!row) {
            res.status(404).json({ error: 'Venda não encontrada' });
            return;
        }
        
        res.json(row);
    });
});

// Endpoint para atualizar venda
app.put('/api/vendas/:id', (req, res) => {
    const id = req.params.id;
    const { id_funcionario, tipo_maquina, quantidade_maquinas, com_desconto, data_venda } = req.body;
    
    console.log(`Atualizando venda ID: ${id}`, req.body);
    
    const sql = `
        UPDATE vendas 
        SET id_funcionario = ?, tipo_maquina = ?, quantidade_maquinas = ?, com_desconto = ?, data_venda = ? 
        WHERE id = ?
    `;
    
    db.run(sql, [id_funcionario, tipo_maquina, quantidade_maquinas, com_desconto, data_venda, id], function(err) {
        if (err) {
            console.error('Erro ao atualizar venda:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (this.changes === 0) {
            res.status(404).json({ error: 'Venda não encontrada' });
            return;
        }
        
        console.log(`Venda ${id} atualizada com sucesso`);
        res.json({ message: 'Venda atualizada com sucesso' });
    });
});

// Endpoint para buscar produção por ID
app.get('/api/producao/:id', (req, res) => {
    const id = req.params.id;
    
    const query = `
        SELECT p.*, f.nome as nome_funcionario 
        FROM producao p 
        JOIN funcionarios f ON p.id_funcionario = f.id 
        WHERE p.id = ?
    `;
    
    db.get(query, [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (!row) {
            res.status(404).json({ error: 'Produção não encontrada' });
            return;
        }
        
        res.json(row);
    });
});

// Endpoint para atualizar produção
app.put('/api/producao/:id', (req, res) => {
    const id = req.params.id;
    const { id_funcionario, maquinas_produzidas, data_producao } = req.body;
    
    console.log(`Atualizando produção ID: ${id}`, req.body);
    
    const sql = `
        UPDATE producao 
        SET id_funcionario = ?, maquinas_produzidas = ?, data_producao = ? 
        WHERE id = ?
    `;
    
    db.run(sql, [id_funcionario, maquinas_produzidas, data_producao, id], function(err) {
        if (err) {
            console.error('Erro ao atualizar produção:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (this.changes === 0) {
            res.status(404).json({ error: 'Produção não encontrada' });
            return;
        }
        
        console.log(`Produção ${id} atualizada com sucesso`);
        res.json({ message: 'Produção atualizada com sucesso' });
    });
});

// Endpoint para excluir venda
app.delete('/api/vendas/:id', (req, res) => {
    const id = req.params.id;
    console.log(`Excluindo venda ID: ${id}`);
    
    db.run('DELETE FROM vendas WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('Erro ao excluir venda:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (this.changes === 0) {
            res.status(404).json({ error: 'Venda não encontrada' });
            return;
        }
        
        console.log(`Venda ${id} excluída com sucesso`);
        res.json({ message: 'Venda excluída com sucesso' });
    });
});

// Endpoint para excluir produção
app.delete('/api/producao/:id', (req, res) => {
    const id = req.params.id;
    console.log(`Excluindo produção ID: ${id}`);
    
    db.run('DELETE FROM producao WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('Erro ao excluir produção:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (this.changes === 0) {
            res.status(404).json({ error: 'Registro de produção não encontrado' });
            return;
        }
        
        console.log(`Produção ${id} excluída com sucesso`);
        res.json({ message: 'Registro de produção excluído com sucesso' });
    });
});

app.get('/api/producao', (req, res) => {
    const query = `
        SELECT p.*, f.nome as nome_funcionario 
        FROM producao p 
        JOIN funcionarios f ON p.id_funcionario = f.id 
        WHERE f.ativo = 1
        ORDER BY p.data_producao DESC
    `;
    
    db.all(query, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/producao', (req, res) => {
    const { id_funcionario, maquinas_produzidas, data_producao } = req.body;
    
    db.run(
        'INSERT INTO producao (id_funcionario, maquinas_produzidas, data_producao) VALUES (?, ?, ?)',
        [id_funcionario, maquinas_produzidas, data_producao],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ id: this.lastID, id_funcionario, maquinas_produzidas, data_producao });
        }
    );
});

app.get('/api/folha-pagamento/:mes', (req, res) => {
    const mes = req.params.mes;
    
    const query = `
        SELECT fp.*, f.nome, f.tipo 
        FROM folha_pagamento fp 
        JOIN funcionarios f ON fp.id_funcionario = f.id 
        WHERE fp.mes_referencia = ? 
        ORDER BY f.nome
    `;
    
    db.all(query, [mes], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/gerar-folha/:mes', (req, res) => {
    const mes = req.params.mes;
    console.log(`Gerando folha para o mês: ${mes}`);
    
    // VERIFICAÇÃO: Verificar se já existe folha para este mês
    db.get('SELECT COUNT(*) as count FROM folha_pagamento WHERE mes_referencia = ?', [mes], (err, result) => {
        if (err) {
            console.error('Erro ao verificar folha existente:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (result.count > 0) {
            // JÁ EXISTE: Retorna erro informando que já existe
            console.log(`Folha do mês ${mes} já existe com ${result.count} registros`);
            return res.status(400).json({ 
                error: `Já existe folha de pagamento para o mês ${mes}. 
                       Para regerar, exclua a folha existente primeiro ou use um mês diferente.` 
            });
        }
        
        // NÃO EXISTE: Pode gerar nova folha
        console.log('Gerando nova folha (não existe registros anteriores)...');
        
        const query = `
            SELECT f.*, 
                   COALESCE(SUM(v.quantidade_maquinas), 0) as total_maquinas_vendidas,
                   COALESCE(SUM(p.maquinas_produzidas), 0) as total_maquinas_produzidas
            FROM funcionarios f
            LEFT JOIN vendas v ON f.id = v.id_funcionario AND strftime('%Y-%m', v.data_venda) = ?
            LEFT JOIN producao p ON f.id = p.id_funcionario AND strftime('%Y-%m', p.data_producao) = ?
            WHERE f.ativo = 1
            GROUP BY f.id
        `;
        
        db.all(query, [mes, mes], (err, funcionarios) => {
            if (err) {
                console.error('Erro ao buscar funcionários:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            
            console.log(`Processando ${funcionarios.length} funcionários...`);
            
            const promessas = funcionarios.map(funcionario => {
                return new Promise((resolve, reject) => {
                    if (funcionario.tipo === 'vendedora') {
                        // Calcular comissões para vendedoras
                        const queryVendas = `
                            SELECT 
                                SUM(CASE WHEN v.tipo_maquina = 'grande' AND v.com_desconto = 1 THEN v.quantidade_maquinas ELSE 0 END) as qtd_grande_com_desconto,
                                SUM(CASE WHEN v.tipo_maquina = 'grande' AND v.com_desconto = 0 THEN v.quantidade_maquinas ELSE 0 END) as qtd_grande_sem_desconto,
                                SUM(CASE WHEN v.tipo_maquina = 'pequena' AND v.com_desconto = 1 THEN v.quantidade_maquinas ELSE 0 END) as qtd_pequena_com_desconto,
                                SUM(CASE WHEN v.tipo_maquina = 'pequena' AND v.com_desconto = 0 THEN v.quantidade_maquinas ELSE 0 END) as qtd_pequena_sem_desconto,
                                SUM(v.quantidade_maquinas) as total_maquinas
                            FROM vendas v 
                            WHERE v.id_funcionario = ? AND strftime('%Y-%m', v.data_venda) = ?
                        `;
                        
                        db.get(queryVendas, [funcionario.id, mes], (err, result) => {
                            if (err) reject(err);
                            else {
                                const qtdGrandeComDesconto = result.qtd_grande_com_desconto || 0;
                                const qtdGrandeSemDesconto = result.qtd_grande_sem_desconto || 0;
                                const qtdPequenaComDesconto = result.qtd_pequena_com_desconto || 0;
                                const qtdPequenaSemDesconto = result.qtd_pequena_sem_desconto || 0;
                                const totalMaquinas = result.total_maquinas || 0;
                                
                                // Calcular comissões corretamente (quantidade × valor unitário)
                                const comissaoGrandeComDesconto = qtdGrandeComDesconto * funcionario.comissao_maquina_grande;
                                const comissaoGrandeSemDesconto = qtdGrandeSemDesconto * (funcionario.comissao_maquina_grande + funcionario.comissao_extra_desconto);
                                const comissaoPequenaComDesconto = qtdPequenaComDesconto * funcionario.comissao_maquina_pequena;
                                const comissaoPequenaSemDesconto = qtdPequenaSemDesconto * (funcionario.comissao_maquina_pequena + funcionario.comissao_extra_desconto);
                                
                                const totalComissao = comissaoGrandeComDesconto + comissaoGrandeSemDesconto + comissaoPequenaComDesconto + comissaoPequenaSemDesconto;
                                
                                let salarioBase = 0;
                                let bonus = 0;
                                
                                if (totalMaquinas >= funcionario.meta_maquinas) {
                                    salarioBase = 0; // Vendedora não tem salário base
                                    const metasCompletas = Math.floor(totalMaquinas / funcionario.meta_maquinas);
                                    
                                    // R$1000 de bonificação + R$1000 de comissão especial por cada 10 máquinas
                                    bonus = metasCompletas * 2000; // R$2000 por cada 10 máquinas (1000 bonificação + 1000 comissão)
                                } else {
                                    salarioBase = 0; // Vendedora não ganha nada se não atingir meta
                                    bonus = 0;
                                }
                                
                                const total = totalComissao + salarioBase + bonus;
                                
                                // Criar detalhamento em JSON
                                const detalheComissoes = {
                                    qtd_grande_com_desconto: qtdGrandeComDesconto,
                                    valor_grande_com_desconto: funcionario.comissao_maquina_grande,
                                    qtd_grande_sem_desconto: qtdGrandeSemDesconto,
                                    valor_grande_sem_desconto: funcionario.comissao_maquina_grande + funcionario.comissao_extra_desconto,
                                    qtd_pequena_com_desconto: qtdPequenaComDesconto,
                                    valor_pequena_com_desconto: funcionario.comissao_maquina_pequena,
                                    qtd_pequena_sem_desconto: qtdPequenaSemDesconto,
                                    valor_pequena_sem_desconto: funcionario.comissao_maquina_pequena + funcionario.comissao_extra_desconto
                                };
                                
                                // INSERT com detalhamento
                                db.run(
                                    'INSERT INTO folha_pagamento (id_funcionario, mes_referencia, salario_base, comissoes, bonus, total, data_geracao, detalhe_comissoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                                    [funcionario.id, mes, salarioBase, totalComissao, bonus, total, new Date().toISOString().split('T')[0], JSON.stringify(detalheComissoes)],
                                    function(err) {
                                        if (err) reject(err);
                                        else resolve();
                                    }
                                );
                            }
                        });
                    } else {
                        // Calcular para produção
                        const queryProducao = `
                            SELECT SUM(maquinas_produzidas) as total_maquinas 
                            FROM producao p 
                            WHERE p.id_funcionario = ? AND strftime('%Y-%m', p.data_producao) = ?
                        `;
                        
                        db.get(queryProducao, [funcionario.id, mes], (err, result) => {
                            if (err) reject(err);
                            else {
                                const totalMaquinas = result.total_maquinas || 0;
                                const comissaoMaquinas = totalMaquinas * funcionario.comissao_maquina_producao;
                                const total = funcionario.salario_base + comissaoMaquinas;
                                
                                // INSERT normal (sem DELETE)
                                db.run(
                                    'INSERT INTO folha_pagamento (id_funcionario, mes_referencia, salario_base, comissoes, bonus, total, data_geracao) VALUES (?, ?, ?, ?, ?, ?, ?)',
                                    [funcionario.id, mes, funcionario.salario_base, comissaoMaquinas, 0, total, new Date().toISOString().split('T')[0]],
                                    function(err) {
                                        if (err) reject(err);
                                        else resolve();
                                    }
                                );
                            }
                        });
                    }
                });
            });
            
            Promise.all(promessas)
                .then(() => {
                    console.log('Folha de pagamento gerada com sucesso!');
                    res.json({ message: 'Folha de pagamento gerada com sucesso!' });
                })
                .catch(err => {
                    console.error('Erro ao gerar folha:', err);
                    res.status(500).json({ error: err.message });
                });
        });
    });
});

// Endpoint para apagar folha de um mês (para poder regerar)
app.delete('/api/folha-pagamento/:mes', (req, res) => {
    const mes = req.params.mes;
    console.log(`Apagando folha do mês: ${mes}`);
    
    db.run('DELETE FROM folha_pagamento WHERE mes_referencia = ?', [mes], function(err) {
        if (err) {
            console.error('Erro ao apagar folha:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        
        console.log(`Folha do mês ${mes} apagada. ${this.changes} registros removidos.`);
        res.json({ 
            message: `Folha do mês ${mes} apagada com sucesso!`,
            registros_removidos: this.changes
        });
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, async () => {
    console.log(`Servidor ERP rodando em http://localhost:${PORT}`);
    
    // Criar tabelas no Supabase se estiver usando
    await createSupabaseTables();
    
    console.log('Endpoints disponíveis:');
    console.log('- GET /api/funcionarios');
    console.log('- POST /api/funcionarios');
    console.log('- PUT /api/funcionarios/:id/desativar');
    console.log('- GET /api/vendas');
    console.log('- POST /api/vendas');
    console.log('- GET /api/producao');
    console.log('- POST /api/producao');
    console.log('- GET /api/folha-pagamento/:mes');
    console.log('- POST /api/gerar-folha/:mes');
});
