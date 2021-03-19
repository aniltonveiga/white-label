// import Vue from 'vue'

const HelperString = {};


/**
 * Limpa a string para comparações
 * @param
 *   Vaga de vendedor Temporário
 * @return
 *  vaga de vendedor temporario
 */
function slugify(text){
  var text = text.toString();
  var from = "ãàáäâẽèéëêìíïîõòóöôùúüûñç·/_,:;";
  var to   = "aaaaaeeeeeiiiiooooouuuunc------";

  for (var i = 0, len = from.length; i < len; i++){
    text = text.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
  }

  return text
      .toString()                     // Cast to string
      .toLowerCase()                  // Convert the string to lowercase letters
      .trim()                         // Remove whitespace from both sides of a string
      .replace(/\s+/g, '-')           // Replace spaces with -
      .replace(/&/g, '-y-')           // Replace & with 'and'
      .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
      .replace(/\-\-+/g, '-');        // Replace multiple - with single -
}


HelperString.cleanStringToCompare = str => {
  if (!str) return '';
  str = str.toString();
  return slugify(str.toLowerCase()).replace(/-/g, ' ')
}


HelperString.removeAccents = str => {
  if (!str) return '';
  var text = str.toString();
  var from = "ãàáäâẽèéëêìíïîõòóöôùúüûñç·/_,:;";
  var to   = "aaaaaeeeeeiiiiooooouuuunc------";

  for (var i = 0, len = from.length; i < len; i++){
    text = text.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
  }

  return text;
}


/**
 * Formata títulos mantendo a primeira letra maiúscula DESDE QUE a palavra tenha 2 ou mais letras
 * @param
 *   VAGA de vendedor Temporário
 * @return
 *  Vaga de Vendedor Temporário
 */
HelperString.toTitle = str => {
  if (!str) return '';
  str = str.toString().toLowerCase().split(' ');

  let wordsToTransform = str.map( word => {
    if( word.length >= 3 ){
      return word.replace(/^\w/, l => l.toUpperCase());
    }else{
      return word;
    }
  } );

  return wordsToTransform.join(' ');
}


/**
 * Valida se string passada é um e-mail válido
 * @return
 *  true | false
 */
HelperString.isEmail = str => {
  if(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(str)){
    return true
  }else{
    return false
  }
}

/**
 * Valida se string é uma senha aceita pela api
 * @return
 *  true | false
 */
HelperString.validPassword = password => {
  if( password.length >= 8 ){
    return true
  }else{
    return false
  }
}

/**
 * Valida se string passada é um cpf válido
 * @return
 *  true | false
 */
HelperString.isCPF = cpf => {
  cpf = cpf.replace(/[^\d]+/g, '');
  if (cpf == '') return false;
  if (cpf.length != 11 ||
      cpf == "00000000000" ||
      cpf == "11111111111" ||
      cpf == "22222222222" ||
      cpf == "33333333333" ||
      cpf == "44444444444" ||
      cpf == "55555555555" ||
      cpf == "66666666666" ||
      cpf == "77777777777" ||
      cpf == "88888888888" ||
      cpf == "99999999999")
      return false;
  let add = 0;
  for (let i = 0; i < 9; i++)
      add += parseInt(cpf.charAt(i)) * (10 - i);
  let rev = 11 - (add % 11);
  if (rev == 10 || rev == 11)
      rev = 0;
  if (rev != parseInt(cpf.charAt(9)))
      return false;
  add = 0;
  for (let i = 0; i < 10; i++)
      add += parseInt(cpf.charAt(i)) * (11 - i);
  rev = 11 - (add % 11);
  if (rev == 10 || rev == 11)
      rev = 0;
  if (rev != parseInt(cpf.charAt(10)))
      return false;
  return true;
}




/**
 * Ordera um array de objetos pela propriedade name
 * @return
 *  []
 */
HelperString.sortBy = (_array, field, order) => {
  if(!order || order == 'asc'){
    return _array.slice().sort((a, b) => (a[field] > b[field]) ? 1 : -1)
  }else{
    return _array.slice().sort((a, b) => (a[field] < b[field]) ? 1 : -1)
  }
}




/**
 * Esconde caracteres de email
 * @return
 *  []
 */
HelperString.censorEmail = email => {
  let hide = email.split("@")[0].length - 2;
  let r = new RegExp(".{"+hide+"}@", "g")
  let maskedEmail = email.replace(r, "***@" );
  return maskedEmail
}



/**
 * Esconde caracteres do telefone
 * @return
 *  []
 */
HelperString.censorPhone = string => {
  let phone = string || '';
  let newPhone = '';
  let showLatest = 2;
  for(var i = 0; i <= phone.length; i++){
    if(phone[i]){
      if( i <= phone.length - 1 - showLatest && !isNaN(phone[i]) ){
        newPhone += '*';
      }else{
        newPhone += phone[i];
      }
    }
  }

  return newPhone;
}



/**
 * Verifica se todos os caracteres são os mesmos, exemplo: 999999
 * @return
 *  []
 */
HelperString.allCharactersSame = s => {
  var n = s.length; 
  for (var i = 1; i < n; i++) 
      if (s[i] != s[0]) 
          return false; 

  return true;
}



/**
 * Remove alguns caracteres antes de enviar para a api
 * @return
 *  []
 */
HelperString.removeSomeCaracters = o => {
  Object.keys(o).forEach(function (k) {
    if (o[k] !== null && typeof o[k] === 'object') {
      HelperString.removeSomeCaracters(o[k]);
      return;
    }
    if (typeof o[k] === 'string') {
      o[k] = o[k].replace(/"/g, "");
    }
  });

  return o;
}


export default {
  install: function(Vue){
    Object.defineProperty(Vue.prototype, '$helpers', { value: HelperString })
  }
}




