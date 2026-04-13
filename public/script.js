const API_BASE = '';

document.addEventListener('DOMContentLoaded', function() {
    console.log('=== DOM CARREGADO ===');
    
    setupNavigation();
    setupModals();
    
    // Aguardar um pouco para garantir que os elementos estejam disponíveis
    setTimeout(() => {
        console.log('=== INICIANDO CARREGAMENTO DE DADOS ===');
        carregarMeses();
        carregarFuncionariosHolerite();
        carregarDashboard();
    }, 100);
    
    // Definir data atual para os formulários
    const hoje = new Date().toISOString().split('T')[0];
    
    // Verificar se os elementos existem antes de definir valores
    const vendaData = document.getElementById('venda-data');
    if (vendaData) {
        vendaData.value = hoje;
    }
    
    const producaoData = document.getElementById('producao-data');
    if (producaoData) {
        producaoData.value = hoje;
    }
    
    // Setup do formulário de funcionários
    setupFuncionarioForm();
});

function setupFuncionarioForm() {
    const tipoSelect = document.getElementById('func-tipo');
    
    if (tipoSelect) {
        // Adicionar listener para mudança de tipo
        tipoSelect.addEventListener('change', function() {
            toggleCamposFuncionario(this.value);
        });
        
        // Configurar estado inicial
        toggleCamposFuncionario(tipoSelect.value);
    }
}

function toggleCamposFuncionario(tipo) {
    // Campos para VENDEDORA
    const camposVendedora = [
        'campo-comissao-grande',
        'campo-comissao-pequena', 
        'campo-comissao-extra',
        'campo-meta',
        'campo-premio-meta',
        'campo-bonus-meta'
    ];
    
    // Campos para PRODUÇÃO
    const camposProducao = [
        'campo-salario',
        'campo-comissao-producao'
    ];
    
    if (tipo === 'vendedora') {
        // Mostrar campos de vendedora, esconder de produção
        camposVendedora.forEach(id => {
            const campo = document.getElementById(id);
            if (campo) campo.style.display = 'block';
        });
        
        camposProducao.forEach(id => {
            const campo = document.getElementById(id);
            if (campo) campo.style.display = 'none';
        });
        
    } else if (tipo === 'producao') {
        // Esconder campos de vendedora, mostrar de produção
        camposVendedora.forEach(id => {
            const campo = document.getElementById(id);
            if (campo) campo.style.display = 'none';
        });
        
        camposProducao.forEach(id => {
            const campo = document.getElementById(id);
            if (campo) campo.style.display = 'block';
        });
        
    } else {
        // Tipo não selecionado - esconder tudo exceto nome e tipo
        [...camposVendedora, ...camposProducao].forEach(id => {
            const campo = document.getElementById(id);
            if (campo) campo.style.display = 'none';
        });
    }
}

function setupNavigation() {
    document.querySelectorAll('.nav .nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Clicou no link:', this);
            console.log('Dataset:', this.dataset);
            
            const page = this.dataset.page;
            console.log('Page:', page);
            
            if (!page) {
                console.error('Dataset.page não encontrado!');
                return;
            }
            
            showPage(page);
            
            document.querySelectorAll('.nav .nav-link').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            switch(page) {
                case 'dashboard':
                    carregarDashboard();
                    break;
                case 'funcionarios':
                    carregarFuncionarios();
                    break;
                case 'vendas':
                    carregarVendas();
                    break;
                case 'producao':
                    carregarProducao();
                    break;
                case 'folha-pagamento':
                    carregarFolhaPagamento();
                    break;
                case 'holerite':
                    carregarFuncionariosHolerite();
                    break;
            }
        });
    });
}

function showPage(pageId) {
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

function setupFormFuncionario() {
    const tipoSelect = document.getElementById('func-tipo');
    tipoSelect.addEventListener('change', function() {
        const campoComissaoGrande = document.getElementById('campo-comissao-grande');
        const campoComissaoPequena = document.getElementById('campo-comissao-pequena');
        const campoComissaoExtra = document.getElementById('campo-comissao-extra');
        const campoMeta = document.getElementById('campo-meta');
        const campoBonusMeta = document.getElementById('campo-bonus-meta');
        const campoBonusMetaExtra = document.getElementById('campo-bonus-meta-extra');
        const campoSalario = document.getElementById('campo-salario');
        const campoComissaoProducao = document.getElementById('campo-comissao-producao');
        
        if (this.value === 'vendedora') {
            campoComissaoGrande.style.display = 'block';
            campoComissaoPequena.style.display = 'block';
            campoComissaoExtra.style.display = 'block';
            campoMeta.style.display = 'block';
            campoBonusMeta.style.display = 'block';
            campoBonusMetaExtra.style.display = 'block';
            campoSalario.style.display = 'none';
            campoComissaoProducao.style.display = 'none';
        } else if (this.value === 'producao') {
            campoComissaoGrande.style.display = 'none';
            campoComissaoPequena.style.display = 'none';
            campoComissaoExtra.style.display = 'none';
            campoMeta.style.display = 'none';
            campoBonusMeta.style.display = 'none';
            campoBonusMetaExtra.style.display = 'none';
            campoSalario.style.display = 'block';
            campoComissaoProducao.style.display = 'block';
        } else {
            campoComissaoGrande.style.display = 'none';
            campoComissaoPequena.style.display = 'none';
            campoComissaoExtra.style.display = 'none';
            campoMeta.style.display = 'none';
            campoBonusMeta.style.display = 'none';
            campoBonusMetaExtra.style.display = 'none';
            campoSalario.style.display = 'none';
            campoComissaoProducao.style.display = 'none';
        }
    });
}

function setupModals() {
    const modalFuncionario = document.getElementById('modalFuncionario');
    if (modalFuncionario) {
        modalFuncionario.addEventListener('show.bs.modal', function() {
            document.getElementById('form-funcionario').reset();
        });
    }
    
    const modalVenda = document.getElementById('modalVenda');
    if (modalVenda) {
        modalVenda.addEventListener('show.bs.modal', function() {
            carregarVendedoras();
            document.getElementById('form-venda').reset();
            const hoje = new Date().toISOString().split('T')[0];
            document.getElementById('venda-data').value = hoje;
            
            // Resetar para modo cadastro
            resetModalVenda();
        });
    }
    
    const modalProducao = document.getElementById('modalProducao');
    if (modalProducao) {
        modalProducao.addEventListener('show.bs.modal', function() {
            carregarProducaoFuncionarios();
            document.getElementById('form-producao').reset();
            const hoje = new Date().toISOString().split('T')[0];
            document.getElementById('producao-data').value = hoje;
            
            // Resetar para modo cadastro
            resetModalProducao();
        });
    }
}

function carregarMeses() {
    console.log('=== CARREGANDO MESES ===');
    const select = document.getElementById('mes-folha');
    
    if (!select) {
        console.error('Elemento mes-folha não encontrado!');
        return;
    }
    
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                   'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const anoAtual = new Date().getFullYear();
    
    // Limpar opções existentes
    select.innerHTML = '<option value="">Selecione o mês...</option>';
    
    // Adicionar últimos 6 meses e próximos 6 meses
    for (let i = -6; i <= 6; i++) {
        const data = new Date(anoAtual, new Date().getMonth() + i, 1);
        const ano = data.getFullYear();
        const mes = data.getMonth();
        const valor = `${ano}-${String(mes + 1).padStart(2, '0')}`;
        const texto = `${meses[mes]} ${ano}`;
        
        const option = document.createElement('option');
        option.value = valor;
        option.textContent = texto;
        
        // Selecionar o mês atual
        if (i === 0) {
            option.selected = true;
        }
        
        select.appendChild(option);
    }
    
    console.log('Meses carregados com sucesso! Total de opções:', select.options.length - 1);
}

async function carregarDashboard() {
    try {
        const [funcionarios, vendas, producao] = await Promise.all([
            fetch(`${API_BASE}/api/funcionarios`).then(r => r.json()),
            fetch(`${API_BASE}/api/vendas`).then(r => r.json()),
            fetch(`${API_BASE}/api/producao`).then(r => r.json())
        ]);
        
        const vendedoras = funcionarios.filter(f => f.tipo === 'vendedora');
        const producaoFuncs = funcionarios.filter(f => f.tipo === 'producao');
        const totalMaquinas = vendas.reduce((sum, v) => sum + v.quantidade_maquinas, 0);
        
        document.getElementById('total-funcionarios').textContent = funcionarios.length;
        document.getElementById('total-vendedoras').textContent = vendedoras.length;
        document.getElementById('total-producao').textContent = producaoFuncs.length;
        document.getElementById('total-maquinas').textContent = totalMaquinas;
        
        const vendasRecentes = vendas.slice(0, 5);
        document.getElementById('vendas-recentes').innerHTML = vendasRecentes.map(v => `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <span>${v.nome_funcionario}</span>
                <span class="badge bg-primary">${v.quantidade_maquinas} máquinas</span>
            </div>
        `).join('');
        
        const producaoRecente = producao.slice(0, 5);
        document.getElementById('producao-recente').innerHTML = producaoRecente.map(p => `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <span>${p.nome_funcionario}</span>
                <span class="badge bg-success">${p.maquinas_produzidas} máquinas</span>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
    }
}

async function carregarFuncionarios() {
    try {
        const response = await fetch(`${API_BASE}/api/funcionarios`);
        const funcionarios = await response.json();
        
        // Separar vendedoras e produção
        const vendedoras = funcionarios.filter(f => f.tipo === 'vendedora');
        const producao = funcionarios.filter(f => f.tipo === 'producao');
        
        // Tabela de Vendedoras
        document.getElementById('tabela-vendedoras').innerHTML = vendedoras.map(f => `
            <tr>
                <td>${f.nome}</td>
                <td>R$ ${(f.comissao_maquina_grande || 0).toFixed(2)}</td>
                <td>R$ ${(f.comissao_maquina_pequena || 0).toFixed(2)}</td>
                <td>R$ ${(f.comissao_extra_desconto || 0).toFixed(2)}</td>
                <td>${f.meta_maquinas || 0}</td>
                <td>R$ ${(f.bonus_meta || 0).toFixed(2)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="editarFuncionario(${f.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="desativarFuncionario(${f.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
        // Tabela de Produção
        document.getElementById('tabela-producao-funcionarios').innerHTML = producao.map(f => `
            <tr>
                <td>${f.nome}</td>
                <td>R$ ${f.salario_base.toFixed(2)}</td>
                <td>R$ ${(f.comissao_maquina_producao || 0).toFixed(2)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="editarFuncionario(${f.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="desativarFuncionario(${f.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
        // Mostrar mensagem se não houver dados
        if (vendedoras.length === 0) {
            document.getElementById('tabela-vendedoras').innerHTML = '<tr><td colspan="7" class="text-center text-muted">Nenhuma vendedora cadastrada</td></tr>';
        }
        
        if (producao.length === 0) {
            document.getElementById('tabela-producao-funcionarios').innerHTML = '<tr><td colspan="4" class="text-center text-muted">Nenhum funcionário de produção cadastrado</td></tr>';
        }
        
    } catch (error) {
        console.error('Erro ao carregar funcionários:', error);
    }
}

async function carregarVendas() {
    try {
        const response = await fetch(`${API_BASE}/api/vendas`);
        const vendas = await response.json();
        
        document.getElementById('tabela-vendas').innerHTML = vendas.map(v => `
            <tr>
                <td>${v.nome_funcionario}</td>
                <td><span class="badge ${v.tipo_maquina === 'grande' ? 'bg-primary' : 'bg-secondary'}">${v.tipo_maquina === 'grande' ? 'Grande' : 'Pequena'}</span></td>
                <td>${v.com_desconto ? 'Sim' : 'Não'}</td>
                <td>${v.quantidade_maquinas}</td>
                <td>${new Date(v.data_venda).toLocaleDateString('pt-BR')}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="editarVenda(${v.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="excluirVenda(${v.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Erro ao carregar vendas:', error);
    }
}

async function carregarProducao() {
    try {
        const response = await fetch(`${API_BASE}/api/producao`);
        const producao = await response.json();
        
        document.getElementById('tabela-producao').innerHTML = producao.map(p => `
            <tr>
                <td>${p.nome_funcionario}</td>
                <td>${p.maquinas_produzidas}</td>
                <td>${new Date(p.data_producao).toLocaleDateString('pt-BR')}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="editarProducao(${p.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="excluirProducao(${p.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Erro ao carregar produção:', error);
    }
}

async function carregarVendedoras() {
    try {
        const response = await fetch(`${API_BASE}/api/funcionarios`);
        const funcionarios = await response.json();
        const vendedoras = funcionarios.filter(f => f.tipo === 'vendedora');
        
        const select = document.getElementById('venda-funcionario');
        select.innerHTML = '<option value="">Selecione...</option>' + 
            vendedoras.map(v => `<option value="${v.id}">${v.nome}</option>`).join('');
        
    } catch (error) {
        console.error('Erro ao carregar vendedoras:', error);
    }
}

async function carregarProducaoFuncionarios() {
    try {
        const response = await fetch(`${API_BASE}/api/funcionarios`);
        const funcionarios = await response.json();
        const producaoFuncs = funcionarios.filter(f => f.tipo === 'producao');
        
        const select = document.getElementById('producao-funcionario');
        select.innerHTML = '<option value="">Selecione...</option>' + 
            producaoFuncs.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
        
    } catch (error) {
        console.error('Erro ao carregar funcionários de produção:', error);
    }
}

async function salvarFuncionario() {
    const nome = document.getElementById('func-nome').value;
    const tipo = document.getElementById('func-tipo').value;
    const comissaoGrande = parseFloat(document.getElementById('func-comissao-grande').value) || 450;
    const comissaoPequena = parseFloat(document.getElementById('func-comissao-pequena').value) || 250;
    const comissaoExtra = parseFloat(document.getElementById('func-comissao-extra').value) || 100;
    const meta = parseInt(document.getElementById('func-meta').value) || 10;
    const premioMeta = parseFloat(document.getElementById('func-premio-meta').value) || 1000;
    const bonusMeta = parseFloat(document.getElementById('func-bonus-meta').value) || 1000;
    const salario = parseFloat(document.getElementById('func-salario').value) || 3000;
    const comissaoProducao = parseFloat(document.getElementById('func-comissao-producao').value) || 100;
    
    if (!nome || !tipo) {
        alert('Preencha todos os campos obrigatórios!');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/funcionarios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nome,
                tipo,
                comissao_maquina_grande: tipo === 'vendedora' ? comissaoGrande : 0,
                comissao_maquina_pequena: tipo === 'vendedora' ? comissaoPequena : 0,
                comissao_extra_desconto: tipo === 'vendedora' ? comissaoExtra : 0,
                meta_maquinas: tipo === 'vendedora' ? meta : 0,
                premio_meta: tipo === 'vendedora' ? premioMeta : 0,
                bonus_meta: tipo === 'vendedora' ? bonusMeta : 0,
                salario_base: tipo === 'producao' ? salario : 0,
                comissao_maquina_producao: tipo === 'producao' ? comissaoProducao : 0
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Funcionário salvo:', data);
            
            // Fechar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalFuncionario'));
            if (modal) {
                modal.hide();
            }
            
            // Limpar formulário
            document.getElementById('form-funcionario').reset();
            
            // Recarregar listas
            carregarFuncionarios();
            carregarDashboard();
            
            // Mostrar sucesso
            alert('Funcionário salvo com sucesso!');
        } else {
            const errorData = await response.text();
            console.error('Erro response:', response.status, errorData);
            alert('Erro ao salvar funcionário: ' + errorData);
        }
        
    } catch (error) {
        console.error('Erro ao salvar funcionário:', error);
        alert('Erro ao salvar funcionário!');
    }
}

async function salvarVenda() {
    console.log('=== salvarVenda() chamada ===');
    
    const idFuncionario = document.getElementById('venda-funcionario').value;
    const tipoMaquina = document.getElementById('venda-tipo-maquina').value;
    const comDesconto = document.getElementById('venda-com-desconto').value === 'true';
    const quantidade = parseInt(document.getElementById('venda-quantidade').value);
    const data = document.getElementById('venda-data').value;
    
    console.log('Dados da venda:', {
        idFuncionario,
        tipoMaquina,
        comDesconto,
        quantidade,
        data
    });
    
    if (!idFuncionario || !tipoMaquina || !quantidade || !data) {
        alert('Preencha todos os campos!');
        return;
    }
    
    try {
        console.log('Enviando requisição para /api/vendas...');
        // Extrair mês da data (formato YYYY-MM)
        const mes = data.substring(0, 7); // Assume data no formato YYYY-MM-DD
        console.log('Mês extraído da data:', mes);
        
        const response = await fetch(`${API_BASE}/api/vendas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_funcionario: idFuncionario,
                tipo_maquina: tipoMaquina,
                quantidade_maquinas: quantidade,
                com_desconto: comDesconto,
                data_venda: data,
                mes: mes
            })
        });
        
        console.log('Response status:', response.status);
        
        if (response.ok) {
            console.log('Venda salva com sucesso!');
            bootstrap.Modal.getInstance(document.getElementById('modalVenda')).hide();
            carregarVendas();
            carregarDashboard();
        } else {
            console.error('Erro ao salvar venda:', response.status);
            alert('Erro ao salvar venda!');
        }
        
    } catch (error) {
        console.error('Erro ao salvar venda:', error);
        alert('Erro ao salvar venda!');
    }
}

async function salvarProducao() {
    const id_funcionario = document.getElementById('producao-funcionario').value;
    const maquinas = parseInt(document.getElementById('producao-maquinas').value);
    const data = document.getElementById('producao-data').value;
    
    if (!id_funcionario || maquinas === null || !data) {
        alert('Preencha todos os campos!');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/producao`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_funcionario,
                maquinas_produzidas: maquinas,
                data_producao: data
            })
        });
        
        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('modalProducao')).hide();
            carregarProducao();
            carregarDashboard();
        } else {
            alert('Erro ao salvar produção!');
        }
        
    } catch (error) {
        console.error('Erro ao salvar produção:', error);
        alert('Erro ao salvar produção!');
    }
}

async function apagarFolhaExistente() {
    const mes = document.getElementById('mes-folha').value;
    
    if (!mes) {
        alert('Selecione um mês para apagar a folha!');
        return;
    }
    
    // Verificar se existe folha para este mês
    try {
        console.log('Verificando folha existente antes de apagar...');
        const checkResponse = await fetch(`${API_BASE}/api/folha-pagamento/${mes}`);
        const folhaExistente = await checkResponse.json();
        
        if (folhaExistente.length === 0) {
            alert(`ATENÇÃO: Não existe folha de pagamento para ${formatarMes(mes)}!\n\n` +
                  `Não há nada para apagar.`);
            return;
        }
        
        // Mostrar resumo antes de apagar
        const totalRegistros = folhaExistente.length;
        const totalVendedoras = folhaExistente.filter(f => f.tipo === 'vendedora').length;
        const totalProducao = folhaExistente.filter(f => f.tipo === 'producao').length;
        const totalGeral = folhaExistente.reduce((sum, f) => sum + f.total, 0);
        
        const confirmacao = confirm(
            `ATENÇÃO: Esta ação irá APAGAR permanentemente a folha de pagamento!\n\n` +
            `Resumo da folha de ${formatarMes(mes)}:\n` +
            `- Total de registros: ${totalRegistros}\n` +
            `- Vendedoras: ${totalVendedoras}\n` +
            `- Produção: ${totalProducao}\n` +
            `- Valor total: R$ ${totalGeral.toFixed(2)}\n\n` +
            `Esta ação é IRREVERSÍVEL!\n\n` +
            `Todos os holerites gerados para este mês deixarão de funcionar.\n\n` +
            `Digite "SIM" para confirmar a exclusão:`
        );
        
        if (confirmacao !== true) {
            return;
        }
        
        // Segunda confirmação com texto específico
        const confirmacaoFinal = prompt(
            `CONFIRMAÇÃO FINAL\n\n` +
            `Para apagar a folha de ${formatarMes(mes)},\n` +
            `digite exatamente: APAGAR FOLHA`
        );
        
        if (confirmacaoFinal !== 'APAGAR FOLHA') {
            alert('Operação cancelada. Texto de confirmação incorreto.');
            return;
        }
        
        // Buscar o botão pelo seletor
        const botao = document.querySelector('button[onclick="apagarFolhaExistente()"]');
        const textoOriginal = botao ? botao.innerHTML : '<i class="bi bi-trash"></i> Apagar Folha';
        
        if (botao) {
            botao.disabled = true;
            botao.innerHTML = '<i class="bi bi-hourglass-split"></i> Apagando...';
        }
        
        try {
            const response = await fetch(`${API_BASE}/api/folha-pagamento/${mes}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                const result = await response.json();
                
                // Log de auditoria
                console.log('AUDITORIA: Folha apagada', {
                    mes: mes,
                    registros_removidos: result.registros_removidos || totalRegistros,
                    valor_total: totalGeral,
                    data_hora: new Date().toISOString()
                });
                
                alert(
                    `Folha de pagamento apagada com sucesso!\n\n` +
                    `Resumo da operação:\n` +
                    `- Registros removidos: ${result.registros_removidos || totalRegistros}\n` +
                    `- Valor total removido: R$ ${totalGeral.toFixed(2)}\n\n` +
                    `Todos os holerites deste mês foram invalidados.`
                );
                
                carregarFolhaPagamento(); // Recarregar a tabela
            } else {
                const erro = await response.json();
                console.error('Erro ao apagar folha:', erro);
                alert(`Erro ao apagar folha!\n\n${erro.error || 'Tente novamente.'}`);
            }
        } catch (error) {
            console.error('Erro ao apagar folha:', error);
            alert('Erro ao apagar folha!\n\nVerifique sua conexão e tente novamente.');
        } finally {
            // Reabilitar botão
            if (botao) {
                botao.disabled = false;
                botao.innerHTML = textoOriginal;
            }
        }
        
    } catch (error) {
        console.error('Erro ao verificar folha existente:', error);
        alert('Erro ao verificar folha existente!\n\nTente novamente.');
    }
}

async function gerarFolhaPagamento() {
    const mes = document.getElementById('mes-folha').value;
    
    if (!mes) {
        alert('Selecione um mês!');
        return;
    }
    
    // Verificar se já existe folha para este mês
    try {
        console.log('Verificando se já existe folha para o mês:', mes);
        const checkResponse = await fetch(`${API_BASE}/api/folha-pagamento/${mes}`);
        const folhaExistente = await checkResponse.json();
        
        if (folhaExistente.length > 0) {
            const totalRegistros = folhaExistente.length;
            const totalVendedoras = folhaExistente.filter(f => f.tipo === 'vendedora').length;
            const totalProducao = folhaExistente.filter(f => f.tipo === 'producao').length;
            const totalGeral = folhaExistente.reduce((sum, f) => sum + f.total, 0);
            
            const confirmacao = confirm(
                `ATENÇÃO: Já existe folha de pagamento para ${formatarMes(mes)}!\n\n` +
                `Registros existentes:\n` +
                `- Vendedoras: ${totalVendedoras}\n` +
                `- Produção: ${totalProducao}\n` +
                `- Total geral: R$ ${totalGeral.toFixed(2)}\n\n` +
                `Deseja APAGAR a folha existente e gerar uma nova?\n\n` +
                `Isso irá recalcular todos os valores!`
            );
            
            if (!confirmacao) {
                return;
            }
            
            // Apagar folha existente
            console.log('Apagando folha existente...');
            const deleteResponse = await fetch(`${API_BASE}/api/folha-pagamento/${mes}`, {
                method: 'DELETE'
            });
            
            if (!deleteResponse.ok) {
                alert('Erro ao apagar folha existente!');
                return;
            }
        }
    } catch (error) {
        console.error('Erro ao verificar folha existente:', error);
    }
    
    // Mostrar confirmação final
    const confirmacaoFinal = confirm(
        `CONFIRMAÇÃO DE GERAÇÃO DE FOLHA DE PAGAMENTO\n\n` +
        `Mês: ${formatarMes(mes)}\n\n` +
        `Esta ação irá:\n` +
        `1. Calcular comissões baseadas em vendas/produção\n` +
        `2. Calcular bônus para vendedoras\n` +
        `3. Gerar folha para todos os funcionários ativos\n` +
        `4. Salvar no banco de dados\n\n` +
        `Deseja continuar?`
    );
    
    if (!confirmacaoFinal) {
        return;
    }
    
    // Buscar o botão pelo seletor
    const botao = document.querySelector('button[onclick="gerarFolhaPagamento()"]');
    const textoOriginal = botao ? botao.innerHTML : '<i class="bi bi-calculator"></i> Gerar Folha';
    
    try {
        console.log('Gerando folha de pagamento para o mês:', mes);
        
        if (botao) {
            botao.disabled = true;
            botao.innerHTML = '<i class="bi bi-hourglass-split"></i> Processando...';
        }
        
        const response = await fetch(`${API_BASE}/api/gerar-folha/${mes}`, {
            method: 'POST'
        });
        
        if (response.ok) {
            const resultado = await response.json();
            console.log('Folha gerada com sucesso:', resultado);
            
            carregarFolhaPagamento();
            
            // Mostrar resumo do resultado
            alert(
                `Folha de pagamento gerada com sucesso!\n\n` +
                `Resumo:\n` +
                `- Total de funcionários: ${resultado.total_funcionarios || 'N/A'}\n` +
                `- Valor total: R$ ${(resultado.valor_total || 0).toFixed(2)}\n\n` +
                `Verifique os detalhes na tabela abaixo.`
            );
        } else {
            const erro = await response.json();
            console.error('Erro ao gerar folha:', erro);
            alert(`Erro ao gerar folha de pagamento!\n\n${erro.error || 'Tente novamente.'}`);
        }
        
    } catch (error) {
        console.error('Erro ao gerar folha:', error);
        alert('Erro ao gerar folha de pagamento!\n\nVerifique sua conexão e tente novamente.');
    } finally {
        // Reabilitar botão
        if (botao) {
            botao.disabled = false;
            botao.innerHTML = textoOriginal;
        }
    }
}

async function carregarFolhaPagamento() {
    const mes = document.getElementById('mes-folha').value || new Date().toISOString().slice(0, 7);
    
    try {
        const response = await fetch(`${API_BASE}/api/folha-pagamento/${mes}`);
        const folha = await response.json();
        
        // Separar vendedoras e produção
        const vendedoras = folha.filter(f => f.tipo === 'vendedora');
        const producao = folha.filter(f => f.tipo === 'producao');
        
        // Calcular totais
        let totalVendedoras = 0;
        let totalProducao = 0;
        
        // Tabela de Vendedoras
        document.getElementById('tabela-folha-vendedoras').innerHTML = vendedoras.map(f => {
            totalVendedoras += f.total;
            
            // Criar detalhamento das comissões
            let detalheComissoes = '';
            if (f.detalhe_comissoes) {
                const detalhes = JSON.parse(f.detalhe_comissoes || '{}');
                const partes = [];
                
                if (detalhes.qtd_grande_sem_desconto > 0) {
                    partes.push(`${detalhes.qtd_grande_sem_desconto}x R$${detalhes.valor_grande_sem_desconto}`);
                }
                if (detalhes.qtd_grande_com_desconto > 0) {
                    partes.push(`${detalhes.qtd_grande_com_desconto}x R$${detalhes.valor_grande_com_desconto}`);
                }
                if (detalhes.qtd_pequena_sem_desconto > 0) {
                    partes.push(`${detalhes.qtd_pequena_sem_desconto}x R$${detalhes.valor_pequena_sem_desconto}`);
                }
                if (detalhes.qtd_pequena_com_desconto > 0) {
                    partes.push(`${detalhes.qtd_pequena_com_desconto}x R$${detalhes.valor_pequena_com_desconto}`);
                }
                
                detalheComissoes = partes.join(' + ') || 'Nenhuma';
            } else {
                detalheComissoes = 'R$ ' + f.comissoes.toFixed(2);
            }
            
            return `
                <tr>
                    <td>${f.nome_funcionario}</td>
                    <td>R$ ${f.comissoes.toFixed(2)}</td>
                    <td><small>${detalheComissoes}</small></td>
                    <td>R$ ${f.bonus.toFixed(2)}</td>
                    <td><strong>R$ ${f.total.toFixed(2)}</strong></td>
                </tr>
            `;
        }).join('') + `
            <tr class="table-primary">
                <td colspan="4"><strong>Total Vendedoras</strong></td>
                <td><strong>R$ ${totalVendedoras.toFixed(2)}</strong></td>
            </tr>
        `;
        
        // Tabela de Produção
        document.getElementById('tabela-folha-producao').innerHTML = producao.map(f => {
            totalProducao += f.total;
            return `
                <tr>
                    <td>${f.nome_funcionario}</td>
                    <td>R$ ${f.salario_base.toFixed(2)}</td>
                    <td>R$ ${f.comissoes.toFixed(2)}</td>
                    <td><strong>R$ ${f.total.toFixed(2)}</strong></td>
                </tr>
            `;
        }).join('') + `
            <tr class="table-success">
                <td colspan="3"><strong>Total Produção</strong></td>
                <td><strong>R$ ${totalProducao.toFixed(2)}</strong></td>
            </tr>
        `;
        
        // Mostrar mensagem se não houver dados
        if (vendedoras.length === 0) {
            document.getElementById('tabela-folha-vendedoras').innerHTML = '<tr><td colspan="5" class="text-center text-muted">Nenhuma vendedora na folha deste mês</td></tr>';
        }
        
        if (producao.length === 0) {
            document.getElementById('tabela-folha-producao').innerHTML = '<tr><td colspan="4" class="text-center text-muted">Nenhum funcionário de produção na folha deste mês</td></tr>';
        }
        
    } catch (error) {
        console.error('Erro ao carregar folha de pagamento:', error);
    }
}

async function excluirVenda(id) {
    if (confirm('Tem certeza que deseja excluir esta venda?')) {
        try {
            const response = await fetch(`${API_BASE}/api/vendas/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                carregarVendas();
                carregarDashboard();
                alert('Venda excluída com sucesso!');
            } else {
                alert('Erro ao excluir venda!');
            }
        } catch (error) {
            console.error('Erro ao excluir venda:', error);
            alert('Erro ao excluir venda!');
        }
    }
}

async function excluirProducao(id) {
    if (confirm('Tem certeza que deseja excluir este registro de produção?')) {
        try {
            const response = await fetch(`${API_BASE}/api/producao/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                carregarProducao();
                carregarDashboard();
                alert('Registro de produção excluído com sucesso!');
            } else {
                alert('Erro ao excluir registro de produção!');
            }
        } catch (error) {
            console.error('Erro ao excluir produção:', error);
            alert('Erro ao excluir registro de produção!');
        }
    }
}

function editarFuncionario(id) {
    console.log('Editar funcionário:', id);
    
    // Buscar dados do funcionário
    fetch(`${API_BASE}/api/funcionarios`)
        .then(response => response.json())
        .then(funcionarios => {
            const funcionario = funcionarios.find(f => f.id === id);
            
            if (funcionario) {
                // Preencher o formulário
                document.getElementById('func-nome').value = funcionario.nome;
                document.getElementById('func-tipo').value = funcionario.tipo;
                document.getElementById('func-comissao-grande').value = funcionario.comissao_maquina_grande || 450;
                document.getElementById('func-comissao-pequena').value = funcionario.comissao_maquina_pequena || 250;
                document.getElementById('func-comissao-extra').value = funcionario.comissao_extra_desconto || 100;
                document.getElementById('func-meta').value = funcionario.meta_maquinas || 10;
                document.getElementById('func-premio-meta').value = funcionario.premio_meta || 1000;
                document.getElementById('func-bonus-meta').value = funcionario.bonus_meta || 1000;
                document.getElementById('func-salario').value = funcionario.salario_base || 0;
                document.getElementById('func-comissao-producao').value = funcionario.comissao_maquina_producao || 100;
                
                // Mostrar/esconder campos conforme o tipo
                toggleCamposFuncionario(funcionario.tipo);
                
                // Mudar o título do modal
                document.querySelector('#modalFuncionario .modal-title').textContent = 'Editar Funcionário';
                
                // Mudar o botão de salvar
                const btnSalvar = document.querySelector('#modalFuncionario .modal-footer .btn-primary');
                btnSalvar.textContent = 'Atualizar';
                btnSalvar.onclick = function() { atualizarFuncionario(id); };
                
                // Abrir o modal
                const modal = new bootstrap.Modal(document.getElementById('modalFuncionario'));
                modal.show();
            }
        })
        .catch(error => {
            console.error('Erro ao buscar funcionário:', error);
            alert('Erro ao buscar dados do funcionário!');
        });
}

async function atualizarFuncionario(id) {
    const nome = document.getElementById('func-nome').value;
    const tipo = document.getElementById('func-tipo').value;
    const comissaoGrande = parseFloat(document.getElementById('func-comissao-grande').value) || 450;
    const comissaoPequena = parseFloat(document.getElementById('func-comissao-pequena').value) || 250;
    const comissaoExtra = parseFloat(document.getElementById('func-comissao-extra').value) || 100;
    const meta = parseInt(document.getElementById('func-meta').value) || 10;
    const premioMeta = parseFloat(document.getElementById('func-premio-meta').value) || 1000;
    const bonusMeta = parseFloat(document.getElementById('func-bonus-meta').value) || 1000;
    const salario = parseFloat(document.getElementById('func-salario').value) || 0;
    const comissaoProducao = parseFloat(document.getElementById('func-comissao-producao').value) || 100;
    
    if (!nome || !tipo) {
        alert('Preencha todos os campos obrigatórios!');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/funcionarios/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nome,
                tipo,
                comissao_maquina_grande: tipo === 'vendedora' ? comissaoGrande : 0,
                comissao_maquina_pequena: tipo === 'vendedora' ? comissaoPequena : 0,
                comissao_extra_desconto: tipo === 'vendedora' ? comissaoExtra : 0,
                meta_maquinas: tipo === 'vendedora' ? meta : 0,
                premio_meta: tipo === 'vendedora' ? premioMeta : 0,
                bonus_meta: tipo === 'vendedora' ? bonusMeta : 0,
                salario_base: tipo === 'producao' ? salario : 0,
                comissao_maquina_producao: tipo === 'producao' ? comissaoProducao : 0
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Funcionário atualizado:', data);
            
            // Fechar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalFuncionario'));
            if (modal) {
                modal.hide();
            }
            
            // Resetar formulário
            document.getElementById('form-funcionario').reset();
            
            // Resetar o botão e título
            document.querySelector('#modalFuncionario .modal-title').textContent = 'Novo Funcionário';
            const btnSalvar = document.querySelector('#modalFuncionario .modal-footer .btn-primary');
            btnSalvar.textContent = 'Salvar';
            btnSalvar.onclick = salvarFuncionario;
            
            // Recarregar listas
            carregarFuncionarios();
            carregarDashboard();
            
            // Mostrar sucesso
            alert('Funcionário atualizado com sucesso!');
        } else {
            const errorData = await response.text();
            console.error('Erro response:', response.status, errorData);
            alert('Erro ao atualizar funcionário: ' + errorData);
        }
        
    } catch (error) {
        console.error('Erro ao atualizar funcionário:', error);
        alert('Erro ao atualizar funcionário!');
    }
}

async function editarVenda(id) {
    try {
        // Buscar dados da venda
        const response = await fetch(`${API_BASE}/api/vendas/${id}`);
        const venda = await response.json();
        
        // Preencher o formulário
        document.getElementById('venda-funcionario').value = venda.id_funcionario;
        document.getElementById('venda-tipo-maquina').value = venda.tipo_maquina;
        document.getElementById('venda-com-desconto').value = venda.com_desconto.toString();
        document.getElementById('venda-quantidade').value = venda.quantidade_maquinas;
        document.getElementById('venda-data').value = venda.data_venda;
        
        // Mudar o título do modal
        document.querySelector('#modalVenda .modal-title').textContent = 'Editar Venda';
        
        // Mudar o botão de salvar
        const btnSalvar = document.querySelector('#modalVenda .modal-footer .btn-primary');
        btnSalvar.textContent = 'Atualizar';
        btnSalvar.setAttribute('onclick', `atualizarVenda(${id})`);
        
        // Abrir o modal
        const modal = new bootstrap.Modal(document.getElementById('modalVenda'));
        modal.show();
        
    } catch (error) {
        console.error('Erro ao carregar venda:', error);
        alert('Erro ao carregar venda para edição!');
    }
}

async function atualizarVenda(id) {
    const idFuncionario = document.getElementById('venda-funcionario').value;
    const tipoMaquina = document.getElementById('venda-tipo-maquina').value;
    const comDesconto = document.getElementById('venda-com-desconto').value === 'true';
    const quantidade = parseInt(document.getElementById('venda-quantidade').value);
    const data = document.getElementById('venda-data').value;
    
    if (!idFuncionario || !tipoMaquina || !quantidade || !data) {
        alert('Preencha todos os campos!');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/vendas/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_funcionario: idFuncionario,
                tipo_maquina: tipoMaquina,
                quantidade_maquinas: quantidade,
                com_desconto: comDesconto,
                data_venda: data
            })
        });
        
        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('modalVenda')).hide();
            carregarVendas();
            carregarDashboard();
            alert('Venda atualizada com sucesso!');
            
            // Resetar o modal para cadastro
            resetModalVenda();
        } else {
            alert('Erro ao atualizar venda!');
        }
        
    } catch (error) {
        console.error('Erro ao atualizar venda:', error);
        alert('Erro ao atualizar venda!');
    }
}

async function editarProducao(id) {
    try {
        // Buscar dados da produção
        const response = await fetch(`${API_BASE}/api/producao/${id}`);
        const producao = await response.json();
        
        // Preencher o formulário
        document.getElementById('producao-funcionario').value = producao.id_funcionario;
        document.getElementById('producao-maquinas').value = producao.maquinas_produzidas;
        document.getElementById('producao-data').value = producao.data_producao;
        
        // Mudar o título do modal
        document.querySelector('#modalProducao .modal-title').textContent = 'Editar Produção';
        
        // Mudar o botão de salvar
        const btnSalvar = document.querySelector('#modalProducao .modal-footer .btn-primary');
        btnSalvar.textContent = 'Atualizar';
        btnSalvar.setAttribute('onclick', `atualizarProducao(${id})`);
        
        // Abrir o modal
        const modal = new bootstrap.Modal(document.getElementById('modalProducao'));
        modal.show();
        
    } catch (error) {
        console.error('Erro ao carregar produção:', error);
        alert('Erro ao carregar produção para edição!');
    }
}

async function atualizarProducao(id) {
    const id_funcionario = document.getElementById('producao-funcionario').value;
    const maquinas = parseInt(document.getElementById('producao-maquinas').value);
    const data = document.getElementById('producao-data').value;
    
    if (!id_funcionario || maquinas === null || !data) {
        alert('Preencha todos os campos!');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/producao/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_funcionario,
                maquinas_produzidas: maquinas,
                data_producao: data
            })
        });
        
        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('modalProducao')).hide();
            carregarProducao();
            carregarDashboard();
            alert('Produção atualizada com sucesso!');
            
            // Resetar o modal para cadastro
            resetModalProducao();
        } else {
            alert('Erro ao atualizar produção!');
        }
        
    } catch (error) {
        console.error('Erro ao atualizar produção:', error);
        alert('Erro ao atualizar produção!');
    }
}

function resetModalVenda() {
    document.querySelector('#modalVenda .modal-title').textContent = 'Nova Venda';
    const btnSalvar = document.querySelector('#modalVenda .modal-footer .btn-primary');
    btnSalvar.textContent = 'Salvar';
    btnSalvar.setAttribute('onclick', 'salvarVenda()');
}

function resetModalProducao() {
    document.querySelector('#modalProducao .modal-title').textContent = 'Nova Produção';
    const btnSalvar = document.querySelector('#modalProducao .modal-footer .btn-primary');
    btnSalvar.textContent = 'Salvar';
    btnSalvar.setAttribute('onclick', 'salvarProducao()');
}

async function exportarPDF() {
    const mes = document.getElementById('mes-folha').value;
    
    console.log('=== exportarPDF() chamada ===');
    console.log('Mês selecionado:', mes);
    
    if (!mes) {
        alert('Selecione um mês para exportar!');
        return;
    }
    
    try {
        console.log('Carregando dados da folha...');
        // Carregar dados da folha
        const response = await fetch(`${API_BASE}/api/folha-pagamento/${mes}`);
        const folha = await response.json();
        
        console.log('Folha carregada:', folha.length, 'registros');
        
        if (folha.length === 0) {
            alert('Não há dados de folha para este mês!');
            return;
        }
        
        console.log('Carregando dados detalhados de vendas e produção...');
        // Carregar dados detalhados de vendas e produção
        const [vendasResponse, producaoResponse] = await Promise.all([
            fetch(`${API_BASE}/api/vendas`).then(r => r.json()),
            fetch(`${API_BASE}/api/producao`).then(r => r.json())
        ]);
        
        console.log('Vendas carregadas:', vendasResponse.length);
        console.log('Produção carregada:', producaoResponse.length);
        
        const vendas = vendasResponse.filter(v => v.data_venda.startsWith(mes));
        const producao = producaoResponse.filter(p => p.data_producao.startsWith(mes));
        
        console.log('Vendas filtradas para o mês:', vendas.length);
        console.log('Produção filtrada para o mês:', producao.length);
        
        console.log('Criando PDF...');
        // Criar PDF com margens ajustadas
        const doc = new window.jspdf.jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        console.log('PDF criado, adicionando conteúdo...');
        
        // Definir margens menores
        const marginLeft = 10;
        const marginRight = 10;
        const marginTop = 20;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const usableWidth = pageWidth - marginLeft - marginRight;
        
        // Cabeçalho
        doc.setFontSize(20);
        doc.text('FOLHA DE PAGAMENTO DETALHADA', pageWidth / 2, 15, { align: 'center' });
        
        doc.setFontSize(12);
        doc.text(`Período: ${formatarMes(mes)}`, pageWidth / 2, 25, { align: 'center' });
        doc.text(`Data de geração: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, 32, { align: 'center' });
        
        let yPosition = 45;
        
        // Resumo Geral
        doc.setFontSize(14);
        doc.text('RESUMO GERAL DO MÊS', 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(10);
        const totalMaquinasVendidas = vendas.reduce((sum, v) => sum + v.quantidade_maquinas, 0);
        const totalMaquinasProduzidas = producao.reduce((sum, p) => sum + p.maquinas_produzidas, 0);
        const totalComissoes = folha.reduce((sum, f) => sum + f.comissoes, 0);
        const totalBonificacoes = folha.reduce((sum, f) => sum + f.bonus, 0);
        
        doc.text(`Total Máquinas Vendidas: ${totalMaquinasVendidas}`, 20, yPosition);
        doc.text(`Total Máquinas Produzidas: ${totalMaquinasProduzidas}`, 20, yPosition + 7);
        doc.text(`Total em Comissões: R$ ${totalComissoes.toFixed(2)}`, 20, yPosition + 14);
        doc.text(`Total em Bonificações: R$ ${totalBonificacoes.toFixed(2)}`, 20, yPosition + 21);
        
        yPosition += 35;
        
        // Detalhes por Vendedora
        const vendedoras = folha.filter(f => f.tipo === 'vendedora');
        if (vendedoras.length > 0) {
            doc.setFontSize(14);
            doc.text('DETALHES POR VENDEDORA', 20, yPosition);
            yPosition += 10;
            
            // Cabeçalho da tabela com espaçamento otimizado
            doc.setFontSize(9);
            const colWidths = [25, 15, 25, 20, 20, 20, 25]; // Largura das colunas em mm
            let xPos = marginLeft;
            
            doc.text('Funcionária', xPos, yPosition);
            xPos += colWidths[0];
            doc.text('Máquinas', xPos, yPosition);
            xPos += colWidths[1];
            doc.text('Detalhe', xPos, yPosition);
            xPos += colWidths[2];
            doc.text('Comissões', xPos, yPosition);
            xPos += colWidths[3];
            doc.text('Bonif.Meta', xPos, yPosition);
            xPos += colWidths[4];
            doc.text('Bonif.Extra', xPos, yPosition);
            xPos += colWidths[5];
            doc.text('Total', xPos, yPosition);
            
            yPosition += 7;
            doc.line(marginLeft, yPosition, marginLeft + usableWidth, yPosition);
            yPosition += 5;
            
            vendedoras.forEach(vendedora => {
                const detalhes = vendedora.detalhe_comissoes ? JSON.parse(vendedora.detalhe_comissoes) : {};
                const partes = [];
                
                if (detalhes.qtd_grande_sem_desconto > 0) {
                    partes.push(`${detalhes.qtd_grande_sem_desconto}x R$${detalhes.valor_grande_sem_desconto || 0}`);
                }
                if (detalhes.qtd_grande_com_desconto > 0) {
                    partes.push(`${detalhes.qtd_grande_com_desconto}x R$${detalhes.valor_grande_com_desconto || 0}`);
                }
                if (detalhes.qtd_pequena_sem_desconto > 0) {
                    partes.push(`${detalhes.qtd_pequena_sem_desconto}x R$${detalhes.valor_pequena_sem_desconto || 0}`);
                }
                if (detalhes.qtd_pequena_com_desconto > 0) {
                    partes.push(`${detalhes.qtd_pequena_com_desconto}x R$${detalhes.valor_pequena_com_desconto || 0}`);
                }
                
                const detalheTexto = partes.join(' + ') || 'Nenhuma';
                const totalMaquinasVendedora = (detalhes.qtd_grande_sem_desconto || 0) + (detalhes.qtd_grande_com_desconto || 0) + 
                                          (detalhes.qtd_pequena_sem_desconto || 0) + (detalhes.qtd_pequena_com_desconto || 0);
                
                doc.setFontSize(8);
                xPos = marginLeft;
                
                doc.text(vendedora.nome_funcionario.substring(0, 12), xPos, yPosition);
                xPos += colWidths[0];
                doc.text(totalMaquinasVendedora.toString(), xPos, yPosition);
                xPos += colWidths[1];
                doc.text(detalheTexto.substring(0, 18), xPos, yPosition);
                xPos += colWidths[2];
                doc.text(`R$ ${vendedora.comissoes.toFixed(0)}`, xPos, yPosition);
                xPos += colWidths[3];
                doc.text(`R$ ${vendedora.bonus.toFixed(0)}`, xPos, yPosition);
                xPos += colWidths[4];
                doc.text(`R$ ${vendedora.bonus.toFixed(0)}`, xPos, yPosition);
                xPos += colWidths[5];
                doc.text(`R$ ${vendedora.total.toFixed(0)}`, xPos, yPosition);
                
                yPosition += 7;
            });
        }
        
        yPosition += 15;
        
        // Verificar se precisa adicionar nova página para produção
        if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
        }
        
        // Detalhes por Produção
        const producaoFolha = folha.filter(f => f.tipo === 'producao');
        if (producaoFolha.length > 0) {
            doc.setFontSize(14);
            doc.text('DETALHES POR PRODUÇÃO', 20, yPosition);
            yPosition += 10;
            
            // Cabeçalho da tabela com espaçamento otimizado
            doc.setFontSize(9);
            const prodColWidths = [25, 15, 25, 20, 20, 25]; // Largura das colunas em mm
            let xPos = marginLeft;
            
            doc.text('Funcionário', xPos, yPosition);
            xPos += prodColWidths[0];
            doc.text('Máquinas', xPos, yPosition);
            xPos += prodColWidths[1];
            doc.text('Salário Base', xPos, yPosition);
            xPos += prodColWidths[2];
            doc.text('Comissão/Máq', xPos, yPosition);
            xPos += prodColWidths[3];
            doc.text('Total Comiss', xPos, yPosition);
            xPos += prodColWidths[4];
            doc.text('Total', xPos, yPosition);
            
            yPosition += 7;
            doc.line(marginLeft, yPosition, marginLeft + usableWidth, yPosition);
            yPosition += 5;
            
            producaoFolha.forEach(funcionario => {
                // Buscar quantidade de máquinas produzidas por este funcionário no mês
                const maquinasProduzidas = producao
                    .filter(p => p.id_funcionario === funcionario.id_funcionario)
                    .reduce((sum, p) => sum + p.maquinas_produzidas, 0);
                
                // Verificar se precisa de nova página
                if (yPosition > 270) {
                    doc.addPage();
                    yPosition = 20;
                    
                    // Repetir cabeçalho na nova página
                    doc.setFontSize(9);
                    xPos = marginLeft;
                    doc.text('Funcionário', xPos, yPosition);
                    xPos += prodColWidths[0];
                    doc.text('Máquinas', xPos, yPosition);
                    xPos += prodColWidths[1];
                    doc.text('Salário Base', xPos, yPosition);
                    xPos += prodColWidths[2];
                    doc.text('Comissão/Máq', xPos, yPosition);
                    xPos += prodColWidths[3];
                    doc.text('Total Comiss', xPos, yPosition);
                    xPos += prodColWidths[4];
                    doc.text('Total', xPos, yPosition);
                    
                    yPosition += 7;
                    doc.line(marginLeft, yPosition, marginLeft + usableWidth, yPosition);
                    yPosition += 5;
                }
                
                doc.setFontSize(8);
                xPos = marginLeft;
                
                doc.text(funcionario.nome_funcionario.substring(0, 12), xPos, yPosition);
                xPos += prodColWidths[0];
                doc.text(maquinasProduzidas.toString(), xPos, yPosition);
                xPos += prodColWidths[1];
                doc.text(`R$ ${funcionario.salario_base.toFixed(0)}`, xPos, yPosition);
                xPos += prodColWidths[2];
                doc.text(`R$ ${(funcionario.comissoes / maquinasProduzidas).toFixed(0)}`, xPos, yPosition);
                xPos += prodColWidths[3];
                doc.text(`R$ ${funcionario.comissoes.toFixed(0)}`, xPos, yPosition);
                xPos += prodColWidths[4];
                doc.text(`R$ ${funcionario.total.toFixed(0)}`, xPos, yPosition);
                
                yPosition += 7;
            });
        }
        
        yPosition += 10;
        
        // Verificar se precisa de nova página para total
        if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
        }
        
        // Total Geral
        doc.line(marginLeft, yPosition, marginLeft + usableWidth, yPosition);
        yPosition += 7;
        doc.setFontSize(12);
        const totalGeral = folha.reduce((sum, f) => sum + f.total, 0);
        doc.text(`TOTAL GERAL: R$ ${totalGeral.toFixed(2)}`, pageWidth / 2, yPosition, { align: 'center' });
        
        // Salvar PDF
        doc.save(`folha-pagamento-detalhada-${mes}.pdf`);
        
    } catch (error) {
        console.error('Erro ao exportar PDF:', error);
        alert('Erro ao exportar PDF!');
    }
}

async function exportarXML() {
    const mes = document.getElementById('mes-folha').value;
    
    if (!mes) {
        alert('Selecione um mês para exportar!');
        return;
    }
    
    try {
        // Carregar dados da folha
        const response = await fetch(`${API_BASE}/api/folha-pagamento/${mes}`);
        const folha = await response.json();
        
        if (folha.length === 0) {
            alert('Não há dados de folha para este mês!');
            return;
        }
        
        // Criar XML
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<folha_pagamento>\n';
        xml += `  <cabecalho>\n`;
        xml += `    <periodo>${mes}</periodo>\n`;
        xml += `    <data_geracao>${new Date().toISOString().split('T')[0]}</data_geracao>\n`;
        xml += `    <empresa>ERP COMISSÕES</empresa>\n`;
        xml += `  </cabecalho>\n`;
        xml += `  <funcionarios>\n`;
        
        let totalGeral = 0;
        folha.forEach(funcionario => {
            xml += `    <funcionario>\n`;
            xml += `      <nome>${funcionario.nome}</nome>\n`;
            xml += `      <tipo>${funcionario.tipo}</tipo>\n`;
            xml += `      <salario_base>${funcionario.salario_base.toFixed(2)}</salario_base>\n`;
            xml += `      <comissoes>${funcionario.comissoes.toFixed(2)}</comissoes>\n`;
            xml += `      <bonus>${funcionario.bonus.toFixed(2)}</bonus>\n`;
            xml += `      <total>${funcionario.total.toFixed(2)}</total>\n`;
            xml += `    </funcionario>\n`;
            totalGeral += funcionario.total;
        });
        
        xml += `  </funcionarios>\n`;
        xml += `  <totais>\n`;
        xml += `    <total_geral>${totalGeral.toFixed(2)}</total_geral>\n`;
        xml += `    <quantidade_funcionarios>${folha.length}</quantidade_funcionarios>\n`;
        xml += `  </totais>\n`;
        xml += '</folha_pagamento>';
        
        // Baixar XML
        const blob = new Blob([xml], { type: 'text/xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `folha-pagamento-${mes}.xml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
    } catch (error) {
        console.error('Erro ao exportar XML:', error);
        alert('Erro ao exportar XML!');
    }
}

function formatarMes(mes) {
    const [ano, mesNum] = mes.split('-');
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                   'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${meses[parseInt(mesNum) - 1]} ${ano}`;
}

async function desativarFuncionario(id) {
    if (confirm('Tem certeza que deseja desativar este funcionário?')) {
        try {
            const response = await fetch(`${API_BASE}/api/funcionarios/${id}/desativar`, {
                method: 'PUT'
            });
            
            if (response.ok) {
                carregarFuncionarios();
                carregarDashboard();
                alert('Funcionário desativado com sucesso!');
            } else {
                alert('Erro ao desativar funcionário!');
            }
        } catch (error) {
            console.error('Erro ao desativar funcionário:', error);
            alert('Erro ao desativar funcionário!');
        }
    }
}

// Funções do Holerite
async function carregarFuncionariosHolerite() {
    try {
        const response = await fetch(`${API_BASE}/api/funcionarios`);
        const funcionarios = await response.json();
        
        const select = document.getElementById('holerite-funcionario');
        select.innerHTML = '<option value="">Selecione o funcionário...</option>';
        
        funcionarios.filter(f => f.ativo).forEach(func => {
            select.innerHTML += `<option value="${func.id}">${func.nome}</option>`;
        });
        
        // Carregar meses disponíveis
        carregarMesesHolerite();
    } catch (error) {
        console.error('Erro ao carregar funcionários:', error);
    }
}

async function carregarMesesHolerite() {
    console.log('=== CARREGANDO MESES HOLERITE ===');
    const select = document.getElementById('holerite-mes');
    
    if (!select) {
        console.error('Elemento holerite-mes não encontrado!');
        return;
    }
    
    select.innerHTML = '<option value="">Selecione o mês...</option>';
    
    // Carrega últimos 6 meses
    const dataAtual = new Date();
    for (let i = 0; i < 6; i++) {
        const data = new Date(dataAtual.getFullYear(), dataAtual.getMonth() - i, 1);
        const mes = data.toISOString().slice(0, 7);
        const mesesNome = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const mesExtenso = `${mesesNome[data.getMonth()]}/${data.getFullYear()}`;
        select.innerHTML += `<option value="${mes}">${mesExtenso}</option>`;
    }
    
    console.log('Meses do holerite carregados com sucesso! Total de opções:', select.options.length - 1);
}

async function gerarHolerite() {
    console.log('=== INÍCIO GERAR HOLERITE ===');
    const idFuncionario = document.getElementById('holerite-funcionario').value;
    const mes = document.getElementById('holerite-mes').value;
    
    console.log('ID Funcionário:', idFuncionario);
    console.log('Mês:', mes);
    
    if (!idFuncionario || !mes) {
        alert('Selecione o funcionário e o mês!');
        return;
    }
    
    // Buscar o botão pelo seletor
    const botao = document.querySelector('button[onclick="gerarHolerite()"]');
    const textoOriginal = botao ? botao.innerHTML : '<i class="bi bi-file-pdf"></i> Gerar Holerite';
    
    try {
        // Verificar se existe folha para este mês
        console.log('Verificando se existe folha para o mês:', mes);
        const folhaResponse = await fetch(`${API_BASE}/api/folha-pagamento/${mes}`);
        const folhas = await folhaResponse.json();
        
        if (folhas.length === 0) {
            alert(`ATENÇÃO: Não existe folha de pagamento para ${formatarMes(mes)}!\n\n` +
                  `Gere a folha de pagamento primeiro na aba "Folha de Pagamento".`);
            return;
        }
        
        // Buscar dados do funcionário
        console.log('Buscando funcionário...');
        const funcResponse = await fetch(`${API_BASE}/api/funcionarios/${idFuncionario}`);
        
        if (!funcResponse.ok) {
            alert('Funcionário não encontrado!');
            return;
        }
        
        const funcionario = await funcResponse.json();
        console.log('Funcionário encontrado:', funcionario);
        
        // Buscar dados de vendas para calcular o número de máquinas vendidas
        let totalMaquinas = 0;
        if (funcionario.tipo === 'vendedora') {
            const vendasResponse = await fetch(`${API_BASE}/api/vendas`);
            const vendas = await vendasResponse.json();
            console.log('Todas as vendas:', vendas);
            console.log('Filtrando vendas do funcionário', idFuncionario, 'para o mês', mes);
            console.log('Mostrando formato do mês em cada venda:');
            vendas.forEach(v => {
                console.log(`Venda ID: ${v.id}, Funcionário: ${v.id_funcionario}, Mês: "${v.mes}" (tipo: ${typeof v.mes})`);
            });
            const vendasFuncionario = vendas.filter(v => v.id_funcionario == idFuncionario && v.mes === mes);
            console.log('Vendas do funcionário no mês:', vendasFuncionario);
            totalMaquinas = vendasFuncionario.reduce((sum, v) => sum + v.quantidade_maquinas, 0);
            console.log('Total de máquinas vendidas:', totalMaquinas);
        }
        
        // Encontrar folha do funcionário
        const folhaFuncionario = folhas.find(f => f.id_funcionario == idFuncionario);
        console.log('Folha do funcionário:', folhaFuncionario);
        
        if (!folhaFuncionario) {
            const nomeFuncionario = document.querySelector(`#holerite-funcionario option[value="${idFuncionario}"]`)?.text || 'Funcionário';
            alert(`ATENÇÃO: Não há folha de pagamento para ${nomeFuncionario} em ${formatarMes(mes)}!\n\n` +
                  `Verifique se o funcionário está ativo e se a folha foi gerada corretamente.`);
            return;
        }
        
        // Mostrar preview dos dados antes de gerar
        const totalProventos = folhaFuncionario.salario_base + folhaFuncionario.comissoes + (folhaFuncionario.bonus || 0);
        const totalAjustes = folhaFuncionario.ajustes ? 
            JSON.parse(folhaFuncionario.ajustes).reduce((sum, a) => sum + a.valor, 0) : 0;
        const totalFinal = totalProventos + totalAjustes;
        
        const confirmacao = confirm(
            `CONFIRMAÇÃO DE GERAÇÃO DE HOLERITE\n\n` +
            `Dados do Documento:\n` +
            ` Prestador: ${funcionario.nome}\n` +
            ` Tipo: ${funcionario.tipo === 'vendedora' ? 'VENDEDOR' : 'PRODUÇÃO'}\n` +
            ` Mês: ${formatarMes(mes)}\n\n` +
            `Valores:\n` +
            ` Honorários: R$ ${folhaFuncionario.salario_base.toFixed(2)}\n` +
            ` Premiação Performance: R$ ${folhaFuncionario.comissoes.toFixed(2)}\n` +
            ` Premiação Metas: R$ ${(folhaFuncionario.bonus || 0).toFixed(2)}\n` +
            ` Ajustes: R$ ${totalAjustes.toFixed(2)}\n` +
            ` Total Líquido: R$ ${totalFinal.toFixed(2)}\n\n` +
            `Deseja gerar o holerite em PDF?`
        );
        
        if (!confirmacao) {
            return;
        }
        
        if (botao) {
            botao.disabled = true;
            botao.innerHTML = '<i class="bi bi-hourglass-split"></i> Gerando PDF...';
        }
        
        console.log('Exibindo dados na tabela...');
        // Exibir dados na tabela
        exibirHoleriteTabela(funcionario, folhaFuncionario);
        
        // Gerar PDF do holerite
        console.log('Gerando PDF...');
        await gerarPDFHolerite(funcionario, folhaFuncionario, mes, totalMaquinas);
        
        // Log de auditoria
        console.log('AUDITORIA: Holerite gerado', {
            funcionario: funcionario.nome,
            id_funcionario: funcionario.id,
            mes: mes,
            total: totalFinal,
            data_hora: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Erro ao gerar holerite:', error);
        alert('Erro ao gerar holerite!\n\nVerifique sua conexão e tente novamente.');
    } finally {
        // Reabilitar botão
        if (botao) {
            botao.disabled = false;
            botao.innerHTML = textoOriginal;
        }
    }
}

function exibirHoleriteTabela(funcionario, folha) {
    // Esconder mensagem
    document.getElementById('mensagem-holerite').style.display = 'none';
    
    // Limpar tabelas
    document.getElementById('tabela-holerite-vendedoras').innerHTML = '';
    document.getElementById('tabela-holerite-producao').innerHTML = '';
    
    if (funcionario.tipo === 'vendedora') {
        // Mostrar card de vendedoras
        document.getElementById('card-holerite-vendedoras').style.display = 'block';
        document.getElementById('card-holerite-producao').style.display = 'none';
        
        // Adicionar linha na tabela de vendedoras
        const tbody = document.getElementById('tabela-holerite-vendedoras');
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${funcionario.nome}</td>
            <td>R$ ${folha.salario_base.toFixed(2)}</td>
            <td>R$ ${folha.comissoes.toFixed(2)}</td>
            <td>R$ ${folha.bonus.toFixed(2)}</td>
            <td><strong>R$ ${folha.total.toFixed(2)}</strong></td>
            <td>
                <button class="btn btn-sm btn-success" onclick="gerarPDFHolerite(${JSON.stringify(funcionario).replace(/"/g, '&quot;')}, ${JSON.stringify(folha).replace(/"/g, '&quot;')}, '${folha.mes_referencia}')">
                    <i class="bi bi-file-pdf"></i> PDF
                </button>
            </td>
        `;
        tbody.appendChild(row);
        
    } else if (funcionario.tipo === 'producao') {
        // Mostrar card de produção
        document.getElementById('card-holerite-vendedoras').style.display = 'none';
        document.getElementById('card-holerite-producao').style.display = 'block';
        
        // Adicionar linha na tabela de produção
        const tbody = document.getElementById('tabela-holerite-producao');
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${funcionario.nome}</td>
            <td>R$ ${folha.salario_base.toFixed(2)}</td>
            <td>R$ ${folha.comissoes.toFixed(2)}</td>
            <td><strong>R$ ${folha.total.toFixed(2)}</strong></td>
            <td>
                <button class="btn btn-sm btn-success" onclick="gerarPDFHolerite(${JSON.stringify(funcionario).replace(/"/g, '&quot;')}, ${JSON.stringify(folha).replace(/"/g, '&quot;')}, '${folha.mes_referencia}')">
                    <i class="bi bi-file-pdf"></i> PDF
                </button>
            </td>
        `;
        tbody.appendChild(row);
    }
}

let ajustesTemp = [];
let folhaAtual = null;

function adicionarAjuste() {
    const tipo = document.getElementById('ajuste-tipo').value;
    const valor = parseFloat(document.getElementById('ajuste-valor').value) || 0;
    const descricao = document.getElementById('ajuste-descricao').value;
    
    if (valor === 0) {
        alert('Por favor, insira um valor válido!');
        return;
    }
    
    ajustesTemp.push({
        tipo,
        valor,
        descricao
    });
    
    // Limpar campos
    document.getElementById('ajuste-valor').value = '';
    document.getElementById('ajuste-descricao').value = '';
    
    // Atualizar tabela
    atualizarTabelaAjustes();
}

function removerAjuste(index) {
    ajustesTemp.splice(index, 1);
    atualizarTabelaAjustes();
}

function atualizarTabelaAjustes() {
    const tbody = document.getElementById('tabela-ajustes');
    tbody.innerHTML = '';
    
    ajustesTemp.forEach((ajuste, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${ajuste.tipo}</td>
            <td>R$ ${ajuste.valor.toFixed(2)}</td>
            <td>${ajuste.descricao || '-'}</td>
            <td>
                <button class="btn btn-sm btn-danger" onclick="removerAjuste(${index})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function salvarAjustes() {
    if (!folhaAtual) {
        alert('Selecione um funcionário e mês primeiro!');
        return;
    }
    
    try {
        const ajustesJSON = JSON.stringify(ajustesTemp);
        
        const response = await fetch(`${API_BASE}/api/folha-pagamento/${folhaAtual.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ajustes: ajustesJSON
            })
        });
        
        if (response.ok) {
            alert('Ajustes salvos com sucesso!');
            // Recarregar dados
            carregarFuncionariosHolerite();
        } else {
            alert('Erro ao salvar ajustes!');
        }
    } catch (error) {
        console.error('Erro ao salvar ajustes:', error);
        alert('Erro ao salvar ajustes!');
    }
}

async function carregarAjustes(folhaId) {
    try {
        const response = await fetch(`${API_BASE}/api/folha-pagamento/por-id/${folhaId}`);
        const folha = await response.json();
        
        if (folha.ajustes) {
            ajustesTemp = JSON.parse(folha.ajustes);
        } else {
            ajustesTemp = [];
        }
        
        atualizarTabelaAjustes();
        
        // Mostrar card de ajustes
        document.getElementById('card-ajustes').style.display = 'block';
    } catch (error) {
        console.error('Erro ao carregar ajustes:', error);
    }
}

async function gerarPDFHolerite(funcionario, folha, mes, totalMaquinas = 0) {
    console.log('=== Gerando PDF Holerite ===');
    
    const [ano, mesNum] = mes.split('-');
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const mesExtenso = meses[parseInt(mesNum) - 1];
    
    // Variáveis para cálculos
    let totalAjustesProventos = 0;
    let totalAjustesDescontos = 0;
    let totalProventos = 0;
    let totalDescontos = 0;
    let totalLiquido = 0;
    
    // Criar PDF
    const doc = new window.jspdf.jsPDF('p', 'mm', 'a4');
    
    // --- Configurações de Estilo ---
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    
    // 1. Cabeçalho (Empregador e Título)
    doc.rect(10, 10, 190, 20); // Borda externa superior
    doc.text("EMPREGADOR", 12, 14);
    doc.text("Nome: LIONS BRONZE", 12, 19);
    doc.text("Endereço: Rua Candido Sales,202", 12, 23);
    doc.text("CNPJ: 52.835.321/0001-00", 12, 27);
    
    doc.setFontSize(12); 
    doc.text("Recibo de Pagamento de Prestação de Serviços", 100, 15);
    doc.setFontSize(10);
    doc.text(`${mesExtenso}-${ano.substring(2)}`, 175, 25);
    
    // 2. Dados do Prestador de Serviços
    doc.rect(10, 30, 190, 15);
    doc.setFontSize(7);
    doc.text("CÓDIGO", 12, 34);
    doc.text("PRESTADOR DE SERVIÇOS / EMPRESA", 30, 34);
    doc.text("OBJETO DO CONTRATO", 150, 34);
    
    doc.setFontSize(9);
    doc.text(funcionario.id.toString(), 12, 40);
    doc.text(funcionario.nome, 30, 40);
    doc.text(funcionario.tipo === 'vendedora' ? 'VENDEDOR' : 'PRODUÇÃO', 150, 40);
    
    // 3. Tabela de Proventos e Descontos
    doc.rect(10, 45, 190, 100); // Corpo da tabela
    doc.line(10, 52, 200, 52); // Linha do cabeçalho da tabela
    
    // Colunas da tabela
    doc.text("Cód.", 12, 50);
    doc.text("Descrição", 40, 50);
    doc.text("Referência", 110, 50);
    doc.text("Proventos", 140, 50);
    doc.text("Descontos", 170, 50);
    
    // Linhas verticais separadoras
    doc.line(25, 45, 25, 145);
    doc.line(105, 45, 105, 145);
    doc.line(135, 45, 135, 145);
    doc.line(165, 45, 165, 145);
    
    // Preenchimento de Itens
    doc.setFont("helvetica", "normal");
    let yItem = 58;
    
    // Honorários Mensais
    doc.text("001", 12, yItem);
    doc.text("HONORÁRIOS MENSAL", 30, yItem);
    doc.text(folha.salario_base.toFixed(2), 110, yItem);
    doc.text(folha.salario_base.toFixed(2), 140, yItem);
    yItem += 5;
    
    // Premiação por Performance
    if (folha.comissoes > 0) {
        doc.text("002", 12, yItem);
        doc.text("COMISSÕES POR VENDAS", 30, yItem);
        doc.text(folha.comissoes.toFixed(2), 110, yItem);
        doc.text(folha.comissoes.toFixed(2), 140, yItem);
        yItem += 5;
    }
    
    // Prêmio por Meta (apenas para vendedoras) - multiplicado pelo número de vezes que bateu a meta
    if (funcionario.tipo === 'vendedora' && folha.bonus > 0) {
        const vezesBateuMeta = Math.floor(totalMaquinas / (funcionario.meta_maquinas || 10));
        const premioTotal = vezesBateuMeta * (funcionario.premio_meta || 1000);
        doc.text("003", 12, yItem);
        doc.text("PRÊMIO POR META", 30, yItem);
        doc.text(premioTotal.toFixed(2), 110, yItem);
        doc.text(premioTotal.toFixed(2), 140, yItem);
        yItem += 5;
    }
    
    // Bônus por Meta (apenas para vendedoras) - ganha apenas uma vez quando bate a meta
    if (funcionario.tipo === 'vendedora' && folha.bonus > 0 && totalMaquinas >= (funcionario.meta_maquinas || 10)) {
        doc.text("004", 12, yItem);
        doc.text("BÔNUS POR META", 30, yItem);
        doc.text((funcionario.bonus_meta || 1000).toFixed(2), 110, yItem);
        doc.text((funcionario.bonus_meta || 1000).toFixed(2), 140, yItem);
        yItem += 5;
    }
    
    // Ajustes
    totalAjustesProventos = 0;
    totalAjustesDescontos = 0;
    
    if (folha.ajustes) {
        try {
            const ajustes = JSON.parse(folha.ajustes);
            ajustes.forEach((ajuste, index) => {
                const codigo = 100 + index;
                doc.text(codigo.toString(), 12, yItem);
                doc.text(ajuste.tipo, 30, yItem);
                doc.text(ajuste.valor.toFixed(2), 110, yItem);
                
                if (ajuste.valor > 0) {
                    doc.text(ajuste.valor.toFixed(2), 140, yItem);
                    totalAjustesProventos += ajuste.valor;
                } else {
                    doc.text(Math.abs(ajuste.valor).toFixed(2), 170, yItem);
                    totalAjustesDescontos += Math.abs(ajuste.valor);
                }
                yItem += 5;
            });
        } catch (error) {
            console.error('Erro ao parsear ajustes:', error);
        }
    }
    
    // 4. Rodapé de Valores
    doc.rect(125, 145, 75, 15);
    doc.setFont("helvetica", "bold");
    
    totalProventos = folha.salario_base + folha.comissoes + (folha.bonus || 0) + totalAjustesProventos;
    totalDescontos = totalAjustesDescontos;
    totalLiquido = totalProventos - totalDescontos;
    
    doc.text("Total dos Vencimentos", 127, 150);
    doc.text(totalProventos.toFixed(2), 175, 150);
    doc.text("Total dos Descontos", 127, 155);
    doc.text(totalDescontos.toFixed(2), 175, 155);
    doc.text("Líquido a Receber ->", 127, 163);
    doc.text(totalLiquido.toFixed(2), 175, 163);
    
    // 5. Canhoto Lateral
    doc.line(205, 10, 205, 160);
    doc.setFontSize(6);
    doc.text("DECLARO TER RECEBIDO A IMPORTÂNCIA LÍQUIDA DISCRIMINADA NESTE RECIBO.", 208, 10, {angle: 90});
    
    // Rodapé - Via Funcionário
    yItem = 170;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("** 1ª VIA - FUNCIONÁRIO **", 105, yItem, { align: 'center' });
    doc.setFont("helvetica", "normal");
    yItem += 5;
    doc.setFontSize(7);
    doc.text(`Emitido em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}.`, 105, yItem, { align: 'center' });
    
    // Adicionar nova página para a via da empresa
    doc.addPage();
    
    // --- Configurações de Estilo ---
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    
    // 1. Cabeçalho (Empregador e Título)
    doc.rect(10, 10, 190, 20); // Borda externa superior
    doc.text("EMPREGADOR", 12, 14);
    doc.text("Nome: LIONS BRONZE", 12, 19);
    doc.text("Endereço: Rua XYZ, 10", 12, 23);
    doc.text("CNPJ: 00.000.000/001-10", 12, 27);
    
    doc.setFontSize(12);
    doc.text("Recibo de Pagamento de Prestação de Serviços", 100, 15);
    doc.setFontSize(10);
    doc.text(`${mesExtenso}-${ano.substring(2)}`, 175, 25);
    
    // 2. Dados do Prestador de Serviços
    doc.rect(10, 30, 190, 15);
    doc.setFontSize(7);
    doc.text("CÓDIGO", 12, 34);
    doc.text("PRESTADOR DE SERVIÇOS / EMPRESA", 30, 34);
    doc.text("OBJETO DO CONTRATO", 150, 34);
    
    doc.setFontSize(9);
    doc.text(funcionario.id.toString(), 12, 40);
    doc.text(funcionario.nome, 30, 40);
    doc.text(funcionario.tipo === 'vendedora' ? 'VENDEDOR' : 'PRODUÇÃO', 150, 40);
    
    // 3. Tabela de Proventos e Descontos
    doc.rect(10, 45, 190, 100); // Corpo da tabela
    doc.line(10, 52, 200, 52); // Linha do cabeçalho da tabela
    
    // Colunas da tabela
    doc.text("Cód.", 12, 50);
    doc.text("Descrição", 40, 50);
    doc.text("Referência", 110, 50);
    doc.text("Proventos", 140, 50);
    doc.text("Descontos", 170, 50);
    
    // Linhas verticais separadoras
    doc.line(25, 45, 25, 145);
    doc.line(105, 45, 105, 145);
    doc.line(135, 45, 135, 145);
    doc.line(165, 45, 165, 145);
    
    // Preenchimento de Itens
    doc.setFont("helvetica", "normal");
    yItem = 58;
    
    // Honorários Mensais
    doc.text("001", 12, yItem);
    doc.text("HONORÁRIOS MENSAL", 30, yItem);
    doc.text(folha.salario_base.toFixed(2), 110, yItem);
    doc.text(folha.salario_base.toFixed(2), 140, yItem);
    yItem += 5;
    
    // Premiação por Performance
    if (folha.comissoes > 0) {
        doc.text("002", 12, yItem);
        doc.text("COMISSÕES POR VENDAS", 30, yItem);
        doc.text(folha.comissoes.toFixed(2), 110, yItem);
        doc.text(folha.comissoes.toFixed(2), 140, yItem);
        yItem += 5;
    }
    
    // Prêmio por Meta (apenas para vendedoras) - multiplicado pelo número de vezes que bateu a meta
    if (funcionario.tipo === 'vendedora' && folha.bonus > 0) {
        const vezesBateuMeta = Math.floor(totalMaquinas / (funcionario.meta_maquinas || 10));
        const premioTotal = vezesBateuMeta * (funcionario.premio_meta || 1000);
        doc.text("003", 12, yItem);
        doc.text("PRÊMIO POR META", 30, yItem);
        doc.text(premioTotal.toFixed(2), 110, yItem);
        doc.text(premioTotal.toFixed(2), 140, yItem);
        yItem += 5;
    }
    
    // Bônus por Meta (apenas para vendedoras) - ganha apenas uma vez quando bate a meta
    if (funcionario.tipo === 'vendedora' && folha.bonus > 0 && totalMaquinas >= (funcionario.meta_maquinas || 10)) {
        doc.text("004", 12, yItem);
        doc.text("BÔNUS POR META", 30, yItem);
        doc.text((funcionario.bonus_meta || 1000).toFixed(2), 110, yItem);
        doc.text((funcionario.bonus_meta || 1000).toFixed(2), 140, yItem);
        yItem += 5;
    }
    
    // Ajustes (segunda via - reutilizar variáveis)
    totalAjustesProventos = 0;
    totalAjustesDescontos = 0;
    
    if (folha.ajustes) {
        try {
            const ajustes = JSON.parse(folha.ajustes);
            ajustes.forEach((ajuste, index) => {
                const codigo = 100 + index;
                doc.text(codigo.toString(), 12, yItem);
                doc.text(ajuste.tipo, 30, yItem);
                doc.text(ajuste.valor.toFixed(2), 110, yItem);
                
                if (ajuste.valor > 0) {
                    doc.text(ajuste.valor.toFixed(2), 140, yItem);
                    totalAjustesProventos += ajuste.valor;
                } else {
                    doc.text(Math.abs(ajuste.valor).toFixed(2), 170, yItem);
                    totalAjustesDescontos += Math.abs(ajuste.valor);
                }
                yItem += 5;
            });
        } catch (error) {
            console.error('Erro ao parsear ajustes:', error);
        }
    }
    
    // 4. Rodapé de Valores
    doc.rect(125, 145, 75, 15);
    doc.setFont("helvetica", "bold");
    
    totalProventos = folha.salario_base + folha.comissoes + (folha.bonus || 0) + totalAjustesProventos;
    totalDescontos = totalAjustesDescontos;
    totalLiquido = totalProventos - totalDescontos;
    
    doc.text("Total dos Vencimentos", 127, 150);
    doc.text(totalProventos.toFixed(2), 175, 150);
    doc.text("Total dos Descontos", 127, 155);
    doc.text(totalDescontos.toFixed(2), 175, 155);
    doc.text("Líquido a Receber ->", 127, 163);
    doc.text(totalLiquido.toFixed(2), 175, 163);
    
    // 2. Dados do Prestador de Serviços
    doc.rect(10, 30, 190, 15);
    doc.setFontSize(7);
    doc.text("CÓDIGO", 12, 34);
    doc.text("PRESTADOR DE SERVIÇOS / EMPRESA", 30, 34);
    doc.text("OBJETO DO CONTRATO", 150, 34);
    
    doc.setFontSize(9);
    doc.text(funcionario.id.toString(), 12, 40);
    doc.text(funcionario.nome, 30, 40);
    doc.text(funcionario.tipo === 'vendedora' ? 'VENDEDOR' : 'PRODUÇÃO', 150, 40);
    
    // 3. Tabela de Proventos e Descontos
    doc.rect(10, 45, 190, 100); // Corpo da tabela
    doc.line(10, 52, 200, 52); // Linha do cabeçalho da tabela
    
    // Colunas da tabela
    doc.text("Cód.", 12, 50);
    doc.text("Descrição", 40, 50);
    doc.text("Referência", 110, 50);
    doc.text("Proventos", 140, 50);
    doc.text("Descontos", 170, 50);
    
    // Linhas verticais separadoras
    doc.line(25, 45, 25, 145);
    doc.line(105, 45, 105, 145);
    doc.line(135, 45, 135, 145);
    doc.line(165, 45, 165, 145);
    
    // Preenchimento de Itens
    doc.setFont("helvetica", "normal");
    yItem = 58;
    
    // Honorários Mensais
    doc.text("001", 12, yItem);
    doc.text("HONORÁRIOS MENSAL", 30, yItem);
    doc.text(folha.salario_base.toFixed(2), 110, yItem);
    doc.text(folha.salario_base.toFixed(2), 140, yItem);
    yItem += 5;
    
    // Premiação por Performance
    if (folha.comissoes > 0) {
        doc.text("002", 12, yItem);
        doc.text("COMISSÕES POR VENDAS", 30, yItem);
        doc.text(folha.comissoes.toFixed(2), 110, yItem);
        doc.text(folha.comissoes.toFixed(2), 140, yItem);
        yItem += 5;
    }
    
    // Prêmio por Meta (apenas para vendedoras) - multiplicado pelo número de vezes que bateu a meta
    if (funcionario.tipo === 'vendedora' && folha.bonus > 0) {
        const vezesBateuMeta = Math.floor(totalMaquinas / (funcionario.meta_maquinas || 10));
        const premioTotal = vezesBateuMeta * (funcionario.premio_meta || 1000);
        doc.text("003", 12, yItem);
        doc.text("PRÊMIO POR META", 30, yItem);
        doc.text(premioTotal.toFixed(2), 110, yItem);
        doc.text(premioTotal.toFixed(2), 140, yItem);
        yItem += 5;
    }
    
    // Bônus por Meta (apenas para vendedoras) - ganha apenas uma vez quando bate a meta
    if (funcionario.tipo === 'vendedora' && folha.bonus > 0 && totalMaquinas >= (funcionario.meta_maquinas || 10)) {
        doc.text("004", 12, yItem);
        doc.text("BÔNUS POR META", 30, yItem);
        doc.text((funcionario.bonus_meta || 1000).toFixed(2), 110, yItem);
        doc.text((funcionario.bonus_meta || 1000).toFixed(2), 140, yItem);
        yItem += 5;
    }
    
    // Ajustes
    totalAjustesProventos = 0;
    totalAjustesDescontos = 0;
    
    if (folha.ajustes) {
        try {
            const ajustes = JSON.parse(folha.ajustes);
            ajustes.forEach((ajuste, index) => {
                const codigo = 100 + index;
                doc.text(codigo.toString(), 12, yItem);
                doc.text(ajuste.tipo, 30, yItem);
                doc.text(ajuste.valor.toFixed(2), 110, yItem);
                
                if (ajuste.valor > 0) {
                    doc.text(ajuste.valor.toFixed(2), 140, yItem);
                    totalAjustesProventos += ajuste.valor;
                } else {
                    doc.text(Math.abs(ajuste.valor).toFixed(2), 170, yItem);
                    totalAjustesDescontos += Math.abs(ajuste.valor);
                }
                yItem += 5;
            });
        } catch (error) {
            console.error('Erro ao parsear ajustes:', error);
        }
    }
    
    // 4. Rodapé de Valores
    doc.rect(125, 145, 75, 15);
    doc.setFont("helvetica", "bold");
    
    totalProventos = folha.salario_base + folha.comissoes + (folha.bonus || 0) + totalAjustesProventos;
    totalDescontos = totalAjustesDescontos;
    totalLiquido = totalProventos - totalDescontos;
    
    doc.text("Total dos Vencimentos", 127, 150);
    doc.text(totalProventos.toFixed(2), 175, 150);
    doc.text("Total dos Descontos", 127, 155);
    doc.text(totalDescontos.toFixed(2), 175, 155);
    doc.text("Líquido a Receber ->", 127, 163);
    doc.text(totalLiquido.toFixed(2), 175, 163);
    
    // 5. Canhoto Lateral
    doc.line(205, 10, 205, 160);
    doc.setFontSize(6);
    doc.text("DECLARO TER RECEBIDO A IMPORTÂNCIA LÍQUIDA DISCRIMINADA NESTE RECIBO.", 208, 10, {angle: 90});
    
    // Rodapé - Via Empresa
    yItem = 170;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("** 2ª VIA - EMPRESA **", 105, yItem, { align: 'center' });
    doc.setFont("helvetica", "normal");
    yItem += 5;
    doc.setFontSize(7);
    doc.text(`Emitido em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}.`, 105, yItem, { align: 'center' });
    
    // Salvar PDF
    doc.save(`holerite-${funcionario.nome.replace(/\s+/g, '-')}-${mes}.pdf`);
    
    console.log('PDF Holerite gerado com sucesso!');
}

