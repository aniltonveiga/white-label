import Vue from 'vue'

const Encrypts = {};

Encrypts.encrypt = (message, key) => {
  key = key.replace('Token token=', '');

  // Converte Token do cliente em base64
  var token = btoa(key);

  // Gera o IV
  var iv = Vue.prototype.CryptoJS.enc.Base64.parse(token);

  // Gera um número random hexadecimal
  var hex_number = [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');

  // Cria a chave dinâmica com o número random
  var key = Vue.prototype.CryptoJS.enc.Hex.parse(hex_number);

  // Criptografa a mensagem
  var encrypted_text = Vue.prototype.CryptoJS.AES.encrypt(message, key, { iv : iv });

  // Transforma em base64 enviando o número hexadecimal + a mensagem criptografada
  // Envia o hexadecimal para poder descriptografar no ruby
  return btoa(hex_number + encrypted_text.toString());
}


Encrypts.decrypt = (message, key) => {
  key = key.replace('Token token=', '');

  // Converte Token do cliente em base64
  var token = btoa(key);

  // Gera o IV
  var iv = Vue.prototype.CryptoJS.enc.Base64.parse(token);

  // Tira a mensagem de base64
  message = atob(message)

  // Cria a chave dinâmica com o número random vindo na mensagem
  var key = Vue.prototype.CryptoJS.enc.Hex.parse( message.substr(0, 32) );

  // Pega o restante da mensagem e cria o objet para decodificar
  var encrypted = {}
  encrypted.ciphertext = Vue.prototype.CryptoJS.enc.Base64.parse( message.substring(32) );

  // Decodifica
  return Vue.prototype.CryptoJS.AES.decrypt(encrypted, key, { iv: iv }).toString(Vue.prototype.CryptoJS.enc.Utf8);
}

export default {
  install: function(Vue){
    Object.defineProperty(Vue.prototype, '$encrypts', { value: Encrypts })
  }
}