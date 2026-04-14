const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

console.log('Iniciando servidor local...');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rota principal para servir o index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota para debug - verificar se o HTML está sendo servido
app.get('/debug', (req, res) => {
    res.json({
        message: 'Servidor funcionando!',
        publicPath: path.join(__dirname, 'public'),
        indexPath: path.join(__dirname, 'public', 'index.html'),
        files: ['index.html', 'script.js', 'logo_lions-bronze_N5K0Xi.png']
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

// API Routes básicas para teste
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

// Adicionar rotas de vendas e produção para o holerite funcionar
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

// Rota para dashboard
app.get('/api/dashboard/stats', (req, res) => {
    const stats = {
        totalFuncionarios: 0,
        totalVendas: 0,
        totalProducao: 0,
        totalFolha: 0
    };
    
    // Contar funcionários ativos
    db.get('SELECT COUNT(*) as count FROM funcionarios WHERE ativo = 1', (err, row) => {
        if (!err) stats.totalFuncionarios = row.count;
        
        // Contar vendas do mês atual
        const mesAtual = new Date().toISOString().slice(0, 7);
        db.get('SELECT COUNT(*) as count FROM vendas WHERE strftime("%Y-%m", data_venda) = ?', [mesAtual], (err, row) => {
            if (!err) stats.totalVendas = row.count;
            
            // Contar produção do mês atual
            db.get('SELECT COUNT(*) as count FROM producao WHERE strftime("%Y-%m", data_producao) = ?', [mesAtual], (err, row) => {
                if (!err) stats.totalProducao = row.count;
                
                // Contar folha do mês atual
                db.get('SELECT COUNT(*) as count FROM folha_pagamento WHERE mes_referencia = ?', [mesAtual], (err, row) => {
                    if (!err) stats.totalFolha = row.count;
                    
                    res.json(stats);
                });
            });
        });
    });
});

// Adicionar rotas POST para vendas e produção (básicas)
app.post('/api/vendas', (req, res) => {
    const { id_funcionario, tipo_maquina, quantidade_maquinas, com_desconto, data_venda } = req.body;
    
    const query = `INSERT INTO vendas (id_funcionario, tipo_maquina, quantidade_maquinas, com_desconto, data_venda) 
                   VALUES (?, ?, ?, ?, ?)`;
    
    db.run(query, [id_funcionario, tipo_maquina, quantidade_maquinas, com_desconto, data_venda], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ id: this.lastID, message: 'Venda registrada com sucesso!' });
        }
    });
});

app.post('/api/producao', (req, res) => {
    const { id_funcionario, maquinas_produzidas, data_producao } = req.body;
    
    const query = `INSERT INTO producao (id_funcionario, maquinas_produzidas, data_producao) 
                   VALUES (?, ?, ?)`;
    
    db.run(query, [id_funcionario, maquinas_produzidas, data_producao], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ id: this.lastID, message: 'Produção registrada com sucesso!' });
        }
    });
});

// Adicionar rotas DELETE para vendas e produção
app.delete('/api/vendas/:id', (req, res) => {
    db.run('DELETE FROM vendas WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ message: 'Venda excluída com sucesso!' });
        }
    });
});

app.delete('/api/producao/:id', (req, res) => {
    db.run('DELETE FROM producao WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ message: 'Produção excluída com sucesso!' });
        }
    });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log(`Acesse também pelo seu IP: http://192.168.1.101:${PORT}`);
    console.log('Servidor de teste local com SQLite iniciado!');
});
