const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

console.log('Iniciando servidor local completo...');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota de debug
app.get('/debug', (req, res) => {
    res.json({
        message: 'Servidor funcionando!',
        timestamp: new Date().toISOString(),
        rotas: [
            'GET /',
            'GET /debug',
            'GET /api/funcionarios',
            'GET /api/funcionarios/:id',
            'GET /api/folha-pagamento/:mes',
            'GET /api/vendas',
            'GET /api/producao',
            'POST /api/vendas',
            'POST /api/producao',
            'DELETE /api/vendas/:id',
            'DELETE /api/producao/:id',
            'GET /api/dashboard/stats'
        ]
    });
});

// Conectar ao SQLite
const db = new sqlite3.Database('./erp.db', (err) => {
    if (err) {
        console.error('Erro ao conectar ao SQLite:', err);
    } else {
        console.log('Conectado ao SQLite com sucesso!');
    }
});

// API Routes
app.get('/api/funcionarios', (req, res) => {
    db.all('SELECT * FROM funcionarios WHERE ativo = 1', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

app.get('/api/funcionarios/:id', (req, res) => {
    db.get('SELECT * FROM funcionarios WHERE id = ?', [req.params.id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(row);
        }
    });
});

app.get('/api/folha-pagamento/:mes', (req, res) => {
    const query = `
        SELECT fp.*, f.nome as nome_funcionario, f.tipo 
        FROM folha_pagamento fp
        JOIN funcionarios f ON fp.id_funcionario = f.id
        WHERE fp.mes_referencia = ?
    `;
    
    db.all(query, [req.params.mes], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

app.get('/api/vendas', (req, res) => {
    const query = `
        SELECT v.*, f.nome as nome_funcionario 
        FROM vendas v
        JOIN funcionarios f ON v.id_funcionario = f.id
        ORDER BY v.data_venda DESC
    `;
    
    db.all(query, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

app.get('/api/producao', (req, res) => {
    const query = `
        SELECT p.*, f.nome as nome_funcionario 
        FROM producao p
        JOIN funcionarios f ON p.id_funcionario = f.id
        ORDER BY p.data_producao DESC
    `;
    
    db.all(query, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

app.get('/api/dashboard/stats', (req, res) => {
    const stats = {
        totalFuncionarios: 0,
        totalVendas: 0,
        totalProducao: 0,
        totalFolha: 0
    };
    
    db.get('SELECT COUNT(*) as count FROM funcionarios WHERE ativo = 1', (err, row) => {
        if (!err && row) stats.totalFuncionarios = row.count;
        
        const mesAtual = new Date().toISOString().slice(0, 7);
        db.get('SELECT COUNT(*) as count FROM vendas WHERE strftime("%Y-%m", data_venda) = ?', [mesAtual], (err, row) => {
            if (!err && row) stats.totalVendas = row.count;
            
            db.get('SELECT COUNT(*) as count FROM producao WHERE strftime("%Y-%m", data_producao) = ?', [mesAtual], (err, row) => {
                if (!err && row) stats.totalProducao = row.count;
                
                db.get('SELECT COUNT(*) as count FROM folha_pagamento WHERE mes_referencia = ?', [mesAtual], (err, row) => {
                    if (!err && row) stats.totalFolha = row.count;
                    
                    res.json(stats);
                });
            });
        });
    });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor COMPLETO rodando em http://localhost:${PORT}`);
    console.log(`Acesse também pelo seu IP: http://192.168.1.101:${PORT}`);
    console.log('Todas as rotas API estão disponíveis!');
    console.log('Teste: http://192.168.1.101:3000/debug');
});
