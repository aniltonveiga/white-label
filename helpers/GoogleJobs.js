import Vue from 'vue'

const GoogleJobsTags = opportunity => {
  if(!opportunity) return;

  let jsonExists = document.querySelector('script[type="application/ld+json"]');
  if(jsonExists){
    jsonExists.parentElement.removeChild(jsonExists);
  }

  let el = document.createElement('script');
  el.type = 'application/ld+json';
  el.text = JSON.stringify({
    "@context":"https://schema.org/",
    "@type":"JobPosting",
    "title": opportunity.title || '',
    "description":opportunity.responsability || '',
    "identifier":{
      "@type":"PropertyValue",
      "name":opportunity.company_name || '',
      "value":opportunity.company_id || ''
    },
    "datePosted":opportunity.published_at || '',
    "validThrough":opportunity.expired_at || '',
    "hiringOrganization":{
      "@type":"Organization",
      "name":opportunity.company_name || '',
      "sameAs":opportunity.website || '',
      "logo":opportunity.logo || ''
    },
    "jobLocation":{
      "@type":"Place",
      "address":{
        "@type":"PostalAddress",
        "streetAddress": opportunity.address && opportunity.address.street ? opportunity.address.street : '',
        "addressLocality":opportunity.address && opportunity.address.neighborhood ? opportunity.address.neighborhood : '',
        "addressRegion":opportunity.address && opportunity.address.state && opportunity.address.state.abbr ? opportunity.address.state.abbr : '',
        "postalCode":opportunity.address && opportunity.address.zipcode ? opportunity.address.zipcode : '',
        "addressCountry":opportunity.address && opportunity.address.country ? opportunity.address.country : ''
      }
    },
  });

  document.querySelector('head').appendChild(el);
}

export default {
  install: function(Vue){
    Object.defineProperty(Vue.prototype, '$googleJobs', { value: GoogleJobsTags })
  }
}