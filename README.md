# ERP Sistema de Comissões - Máquinas de Costura

Sistema completo para controle de comissões de funcionários PJ, com módulos específicos para vendedoras e equipe de produção.

## 🚀 Funcionalidades

### 👥 Gestão de Funcionários
- Cadastro de vendedoras (comissão por máquina vendida)
- Cadastro de equipe de produção (salário base + bônus por produção)
- Configuração individual de comissões e salários

### 💰 Controle de Comissões

**Vendedoras:**
- Comissão por máquina vendida (R$550/R$450 grande, R$350/R$250 pequena)
- Bônus de R$2000 a cada 10 máquinas vendidas
- Registro detalhado de vendas com tipo e desconto

**Equipe de Produção:**
- Salário base configurável
- Comissão por máquina produzida
- Registro diário/mensal de produção

### 📊 Dashboard e Relatórios
- Visão geral de funcionários
- Estatísticas de vendas e produção
- Folha de pagamento detalhada
- Exportação em PDF com todos os detalhes

### 📋 Folha de Pagamento
- Geração automática mensal
- Cálculo baseado no tipo de funcionário
- PDF detalhado para conferência manual
- Exportação XML para integração

## 🛠️ Tecnologias

- **Backend:** Node.js + Express
- **Frontend:** HTML5 + CSS3 + JavaScript
- **Banco de Dados:** SQLite (local) / Supabase (produção)
- **UI Framework:** Bootstrap 5
- **PDF Generation:** jsPDF

## 🌐 Deploy

### Render (Backend)
- URL: https://erp-maquinas.onrender.com
- Node.js server
- Auto-deploy do GitHub

### Supabase (Banco de Dados)
- PostgreSQL na nuvem
- Tables: funcionarios, vendas, producao, folha_pagamento
- API REST automática

## � Instalação Local

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/erp-maquinas-costura.git
cd erp-maquinas-costura
```

2. Instale as dependências:
```bash
npm install
```

3. Inicie o servidor:
```bash
npm start
```

4. Acesse o sistema:
```
http://localhost:3000
```

## 🎯 Como Usar

### 1. Cadastro de Funcionários
- Acesse "Funcionários" no menu lateral
- Clique em "Novo Funcionário"
- Selecione o tipo (Vendedora ou Produção)
- Preencha os dados específicos

### 2. Registro de Vendas
- Vá para "Vendas" no menu
- Selecione a vendedora
- Informe quantidade, tipo e se tem desconto
- Salve o registro

### 3. Registro de Produção
- Acesse "Produção" no menu
- Selecione o funcionário
- Informe quantidade de máquinas produzidas
- Salve o registro

### 4. Geração da Folha
- Vá para "Folha de Pagamento"
- Selecione o mês desejado
- Clique em "Gerar Folha"
- Exporte em PDF para conferência

## 💡 Regras de Cálculo

### Vendedoras
```
Comissão = (Qtd Grande s/ Desconto × R$550) + (Qtd Grande c/ Desconto × R$450)
         + (Qtd Pequena s/ Desconto × R$350) + (Qtd Pequena c/ Desconto × R$250)

Bônus = (Total Máquinas ÷ 10) × R$2000

Salário Total = Comissão + Bônus
```

### Produção
```
Comissão = Máquinas Produzidas × Valor por Máquina

Salário Total = Salário Base + Comissão
```

## 🔧 Configuração de Ambiente

### Variáveis de Ambiente (Produção)
```env
NODE_ENV=production
PORT=3000
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
SUPABASE_DB_PASSWORD=your_db_password
```

## 📁 Estrutura do Projeto

```
ERP/
├── server.js              # Servidor Node.js com API
├── package.json           # Dependências do projeto
├── public/
│   ├── index.html        # Interface web principal
│   └── script.js         # Lógica do frontend
├── .gitignore            # Arquivos ignorados pelo Git
├── iniciar-sistema.bat   # Script para iniciar sistema (Windows)
└── README.md             # Documentação
```

## 🔄 Deploy Automático

O sistema está configurado para deploy automático no Render:

1. **Push** para o branch `main`
2. **Render** detecta automaticamente
3. **Build** e **deploy** automático
4. **URL** disponível em minutos

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📞 Suporte

Sistema desenvolvido para controle simplificado de comissões PJ, servindo como base para folha de pagamento real.

**Deploy:** Render + Supabase  
**Desenvolvimento:** Local com SQLite  
**Produção:** Nuvem com PostgreSQL
