# 🌌 PA Solar System Simulator

Um simulador interativo do sistema solar em 3D desenvolvido com Three.js, que permite explorar e personalizar planetas, luas, cometas e modelos 3D numa experiência espacial imersiva.

## 🎮 Controlos de Navegação

### Movimento da Câmara
- **W, A, S, D**: Movimento horizontal
- **Q**: Subir
- **R**: Descer
- **Rato**: Clicar no ecrã para activar o modo de olhar livre

### Controlos Gerais
- **Pause/Continue**: Pausar ou retomar a simulação
- **Reset**: Restaurar posições iniciais

## 🛠️ Como Utilizar o Simulador

### 1. Simulação Básica - "Simulação"

**Aba "Simulação"**
- Ajustar a **Velocidade de Rotação** com o deslizador (0-180°/s)
- Utilizar o botão **Pause** para parar a simulação
- **Reset** para voltar às configurações iniciais
- Monitorizar informações em tempo real (FPS, posição da câmara, contador de objectos)

### 2. Gestão de Objectos - "Objetos"

**Adicionar Planetas**
- Inserir nome do planeta no campo "Nome do Planeta"
- Escolher textura (aleatória ou específica)
- Clicar em **"Adicionar Planeta"**
- Máximo: 10 planetas

**Aplicar Texturas**
- Seleccionar um objecto na lista
- Escolher uma textura disponível
- Clicar em **"Aplicar Textura"**

**Carregar Modelos 3D**
- Seleccionar modelo na lista (satélite, foguetão, astronauta, etc.)
- Clicar em **"Carregar Modelo"**
- Máximo: 5 modelos

**Sistema de Luas**
- Seleccionar planeta pai
- Inserir nome da lua
- Ajustar tamanho (0.1 - 1.0)
- Clicar em **"Adicionar Lua"**
- Máximo: 3 luas por planeta

**Sistema de Cometas**
- Definir nome do cometa
- Ajustar raio orbital (20-60)
- Configurar velocidade orbital
- Escolher cor da luz
- Ajustar intensidade luminosa
- **"Adicionar Cometa"** ou **"Cometa Aleatório"**
- Máximo: 5 cometas

### 3. Editor Avançado - "Editor"

- Seleccionar objecto na aba "Objectos"
- Ajustar propriedades específicas:

**Para Planetas:**
- **Velocidade Orbital**: Rapidez do movimento orbital
- **Escala**: Tamanho do planeta
- **Rotação** (X, Y, Z): Orientação do planeta
- **Posição** (X, Y, Z): Localização no espaço

**Para o Sol:**
- **Intensidade da Luz**: Brilho da iluminação
- **Cor da Luz**: Tonalidade da luz solar
  

Clicar em **"Aplicar Mudanças"**
**"Reset Objeto"** para restaurar valores originais
