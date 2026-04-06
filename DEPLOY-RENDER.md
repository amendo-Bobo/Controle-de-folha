# Configuração Manual do Render

Siga estes passos para configurar o deploy no Render manualmente:

## 🚀 1. Criar Web Service

1. Acesse [render.com](https://render.com)
2. Clique em "New" → "Web Service"
3. Conecte sua conta GitHub
4. Selecione o repositório `erp-maquinas-costura`

## ⚙️ 2. Configurações Básicas

### **Name**
```
erp-maquinas
```

### **Region**
```
US East (Ohio)  # ou mais próxima do Brasil
```

### **Branch**
```
main
```

### **Runtime**
```
Node
```

### **Build Command**
```
npm install
```

### **Start Command**
```
npm start
```

## 🌍 3. Variáveis de Ambiente

Adicione estas variáveis na seção "Environment":

### **Variáveis Obrigatórias**
```
NODE_ENV=production
PORT=3000
```

### **Variáveis do Supabase**
```
SUPABASE_URL=sua_url_supabase_aqui
SUPABASE_SERVICE_KEY=sua_service_key_aqui
SUPABASE_ANON_KEY=sua_anon_key_aqui
```

### **Variáveis Opcionais**
```
APP_NAME=ERP Máquinas de Costura
APP_VERSION=1.0.0
```

## 🏥 4. Health Check

### **Health Check Path**
```
/
```

## 📁 5. Build Settings

### **Auto-Deploy**
```
✅ Ativado
```

## 🔧 6. Advanced Settings

### **Instance Type**
```
Free (para começar)
```

## 📋 7. Resumo das Configurações

Copie e cole estas configurações:

| Configuração | Valor |
|-------------|-------|
| Name | erp-maquinas |
| Runtime | Node |
| Build Command | npm install |
| Start Command | npm start |
| Health Check Path | / |
| Auto-Deploy | ✅ Sim |
| Instance Type | Free |

## 🎯 8. Variáveis de Ambiente - Exemplo

```env
NODE_ENV=production
PORT=3000
SUPABASE_URL=https://seuprojeto.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🔄 9. Deploy Automático

Após configurar:
1. **Push** para o GitHub → **Deploy** automático
2. **URL final:** `https://erp-maquinas.onrender.com`
3. **Status:** Acompanhe no dashboard do Render

## ⚠️ 10. Dicas Importantes

- **Plano Free:** Desativa após 15min inatividade
- **Cold Start:** Primeiro acesso pode demorar
- **Logs:** Monitore no dashboard do Render
- **Variáveis:** Mantenha secrets seguros

## 🔍 11. Verificação Pós-Deploy

Após o deploy, verifique:
- [ ] Site acessível na URL
- [ ] API endpoints funcionando
- [ ] Conexão com Supabase OK
- [ ] Logs sem erros

## 📞 12. Suporte

Se tiver problemas:
1. Verifique os **logs** no Render
2. Confirme as **variáveis de ambiente**
3. Teste **localmente** primeiro
4. Verifique o **build log**

---

**Pronto!** Com estas configurações seu sistema estará no ar em minutos! 🚀
