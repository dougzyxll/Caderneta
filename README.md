# Caderneta — app Android

Gestão financeira pessoal: contas, cartões de crédito com faturas e parcelas, orçamento por categoria, recorrências, metas e relatórios. Funciona offline, sem login; os dados ficam num arquivo privado do app no celular.

Feito com [Capacitor](https://capacitorjs.com) (o app é uma página web empacotada como app Android nativo).

## Estrutura

| Pasta / arquivo | O que é |
|---|---|
| `src/` | Código do app: `engine.js` (cálculos financeiros), `app1-3.js` (telas e lógica), `shell.html` (layout e estilos) |
| `scripts/build_www.py` | Junta `src/` com as fontes num único `www/index.html` |
| `scripts/make_icons.py` | Gera ícones, tela de abertura e imagens da loja (precisa de Pillow) |
| `android/` | Projeto Android gerado pelo Capacitor |
| `.github/workflows/android.yml` | Compila o app no GitHub a cada envio para a branch `main` |
| `docs/privacidade.html` | Política de privacidade (publicar via GitHub Pages) |
| `store/` | Ícone 512, gráfico de destaque e textos da ficha da Play Store |

## Instalar no celular (sem chaves, sem Play Store)

1. Crie um repositório **público** no GitHub, por exemplo `caderneta`.
2. Envie esta pasta para ele. O jeito mais fácil sem terminal é o **GitHub Desktop**: *File → Add local repository* (escolha a pasta), depois *Publish repository* e desmarque “Keep this code private”.
   Pelo terminal:
   ```
   git init
   git add .
   git commit -m "Caderneta 1.0"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/caderneta.git
   git push -u origin main
   ```
3. O GitHub compila o app sozinho (aba **Actions**, uns 5 a 8 minutos). Não precisa cadastrar nada.
4. No celular, abra `https://github.com/SEU_USUARIO/caderneta/releases/tag/app`, toque em **Caderneta.apk**, abra o arquivo baixado e permita “instalar apps desconhecidos” quando o Android pedir.

Cada vez que o projeto muda, um novo `Caderneta.apk` substitui o anterior no mesmo endereço. Instalar a versão nova por cima mantém seus dados.

## Play Store: chave de assinatura

Só para gerar o arquivo `.aab` da loja. No repositório: **Settings → Secrets and variables → Actions → New repository secret**, e cadastre os 4 segredos descritos em `SEGREDOS-github.txt` (vem no zip da chave): `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`.
Depois disso, cada compilação também gera o `caderneta-playstore-aab-…`, que você baixa em **Actions → (execução) → Artifacts**.

> O app instalado pelo APK e o da Play Store usam assinaturas diferentes. Antes de trocar para a versão da loja, exporte um backup, desinstale o APK e importe o backup no app da loja.

## Publicar a política de privacidade

No repositório: **Settings → Pages → Build and deployment → Branch: `main`, pasta `/docs` → Save**. Em alguns minutos ela fica em:
`https://SEU_USUARIO.github.io/caderneta/privacidade.html`

Antes, troque `SEU_EMAIL_DE_CONTATO` em `docs/privacidade.html` pelo e-mail que quer mostrar publicamente.

## Play Console

1. Crie a conta de desenvolvedor em https://play.google.com/console (taxa única de US$ 25 e verificação de identidade).
2. **Criar app** → nome “Caderneta: Finanças Pessoais”, idioma português (Brasil), app, gratuito.
3. Preencha **Conteúdo do app** com as respostas de `store/ficha-da-loja.md` (privacidade, anúncios, segurança dos dados, público-alvo, classificação, recursos financeiros).
4. Preencha a **Ficha da loja principal** com os textos e imagens de `store/`, mais pelo menos 2 capturas de tela do celular.
5. **Teste fechado** (obrigatório para contas pessoais novas): crie uma faixa de teste fechado, envie o `.aab`, adicione os e-mails de **pelo menos 12 testadores** e mande o link de convite. Eles precisam aceitar e manter o app instalado por **14 dias seguidos**.
6. Depois dos 14 dias, peça o **acesso à produção** na Play Console e envie a versão para revisão.

Ao enviar o primeiro `.aab`, aceite o **Assinatura de apps do Google Play** (padrão). A chave deste projeto vira a sua *chave de upload*.

## Atualizar o app

Edite os arquivos em `src/` e faça `push`. O número da versão sobe sozinho a cada compilação (`versionCode` = número da execução no GitHub). Baixe o novo `.aab` e envie em uma nova versão na Play Console.

O identificador do app é `com.arthurpontes.caderneta`. Se quiser outro, troque **antes** do primeiro envio à Play Store: depois de publicado ele não pode mudar. A troca mexe em `capacitor.config.json`, `android/app/build.gradle` e na pasta do `MainActivity.java`.

## Compilar no computador (opcional)

Requer Node 22, JDK 21 e Android Studio:
```
npm ci
python3 scripts/build_www.py
npx cap sync android
npx cap open android
```
