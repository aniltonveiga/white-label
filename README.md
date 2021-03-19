# ninenine-white-label
Este repositório funciona como uma extensão dos projetos White Labels criados com **VueJS**. Aqui você encontrará Plugins e Vuex Stores que são úteis em todos os projetos.

## Instalação
No arquivo package.json do projeto, adicione a dependência:
```javascript
"ninenine-white-label": "git+https://nineninejobs@bitbucket.org/nineninejobs/ninenine-white-label.git",
```

## Como Usar a Store

### Módulo de Oportunidades
Dentro da store do projeto, importe e registre o módulo:
```javascript
import opportunities from 'ninenine-white-label/store/modules/opportunities'

export default new Vuex.Store({
	modules: {
		opportunities,
		. . . 
	},
	. . .
```

#### Os states disponíveis neste módulo são:
- **all**: Todas as oportunidades
- **uniqueTitles**: Todos os títulos únicos de oportunidades
- **searchTerm**: Último termo usado na busca


#### Busca de Oportunidades
Para buscar oportunidades, utilize o dispatch setOpportunities (Todos os parâmetros são opcionais)
```javascript
this.$store.dispatch('opportunities/setOpportunities', {
	'collection': ,
	'page': '',
	'jobName': '',
	. . .
	. . .
}).then(...
```

#### Limpar Oportunidades Encontradas
```javascript
this.$store.commit('opportunities/CLEAR_OPPORTUNITIES');
```

------------

### Módulo de Localização
Dentro da store do projeto, importe e registre o módulo:
```javascript
import opportunities from 'ninenine-white-label/store/modules/location'

export default new Vuex.Store({
	modules: {
		location,
		. . . 
	},
	. . .
```

#### Os states disponíveis neste módulo são:
- **userLocation**: Localização do usuário
- **states**: Listagem de estados
- **cities**: Listagem de cidades (de acordo com o estado selecionado)

#### Localização do usuário
Para setar a localização do usuário basta chamar o dispatch
```javascript
this.$store.dispatch('location/setUserLocation', this.$geoip2);
```

> this.$geoip2 é o plugin fornecedor da localização do usuário. Mais abaixo na seção **Como Usar a Plugins** você encontra Informações de como instalá-lo

## Como Usar a Plugins
TODO :)