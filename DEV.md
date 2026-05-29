# Criar firestore db
No console firebase:
1. Adicionar App
2. Web
3. Registra o App web
4. Atualiza a const do ```firebaseConfig```com informações do web app cadastrado
5. Ativar o authetication no web app direstore
    - Na sidebar, em atalhos do projeto, Authentication
    - Ativar O Google como provedor de Login
6.Adicionar ro dominio  
    - Authentication -> Configurações

5. rodar com ```python3 -m http.server 5500```


```js
const firebaseConfig = {
  apiKey: "AIzaSyAPK8IRNmA87EjPrLxcCtNP8HzfHlX3HsY",
  authDomain: "mentorias-impulse.firebaseapp.com",
  projectId: "mentorias-impulse",
  storageBucket: "mentorias-impulse.firebasestorage.app",
  messagingSenderId: "1041303600981",
  appId: "1:1041303600981:web:de356a424edb93de97b9dc"
};

```

