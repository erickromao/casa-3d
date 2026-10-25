# Casa 3D

Passeio 3D realista da casa (Three.js): texturas PBR, capim animado, céu HDRI, móveis, dia/noite.

```
npm install
node scripts/baixar-assets.mjs   # baixa texturas, céus e móveis CC0 do Poly Haven (~50 MB, só na 1ª vez)
npm run dev                      # abre em http://localhost:5173
```

Controles: WASD ou setas (← → giram), Shift corre, arrastar o mouse olha ao redor.
Medidas da casa: `src/casa.js` (objeto `M` e as listas de paredes/vãos). Móveis: lista `MOVEIS` em `src/main.js`.
`modelo/` tem o OBJ para abrir no Blender (`gerar_casa.py`).
Créditos: texturas, HDRIs e modelos de polyhaven.com (CC0).

## Celular (Android e iPhone, offline)
O app usa Capacitor: o build do Vite (com todos os assets) vai dentro do app, sem servidor.
Controles no celular: joystick virtual (metade esquerda da tela), arrastar na direita = olhar, botão ☰ = menu. Roda em paisagem.

**Android (APK)** — precisa de JDK 21 e Android SDK (`~/Android/Sdk`):
```
npm run apk          # gera android/app/build/outputs/apk/debug/app-debug.apk
adb install -r android/app/build/outputs/apk/debug/app-debug.apk   # ou copie o APK para o celular e abra
```
**iPhone** — só compila num Mac com Xcode (e CocoaPods não é necessário, usa Swift Package Manager):
```
npm install && node scripts/baixar-assets.mjs
npm run ios          # builda, sincroniza e abre o Xcode; escolha seu iPhone/Team e clique Run
```
Com Apple ID gratuito o app instalado expira em 7 dias; com conta de desenvolvedor (US$ 99/ano) dura 1 ano / TestFlight.

## GitHub Pages (jeito mais simples para celular)
`.github/workflows/pages.yml` builda e publica a cada push na `main` (baixa os assets CC0 na hora; eles não vão para o repositório).
Ative uma vez em GitHub → Settings → Pages → Source: **GitHub Actions**. O site fica em https://erickromao.github.io/casa-3d/ e abre no celular (Android e iPhone) sem instalar nada.
Botão **Voar**: voo livre (joystick anda na direção do olhar; ▲/▼ no celular, Espaço/C no teclado).
