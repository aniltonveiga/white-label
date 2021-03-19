import Vue from 'vue'

Vue.prototype.$head = obj => {
  return {
    title: {
      inner: obj.title
    },

    link: [
      {
        rel: "canonical",
        ref: obj.canonical
      }
    ],

    meta: [
      {
        name: "description",
        content: obj.meta_description
      },

      {
        property: "og:type",
        content: "website"
      },

      {
        property: "og:title",
        content: obj.title
      },

      {
        property: "og:url",
        content: obj.canonical
      },

      {
        property: "og:image",
        content: obj.image
      },

      {
        property: "og:site_name",
        content: obj.site_name
      },

      {
        property: "og:description",
        content: obj.meta_description
      },

      {
        name: "google-site-verification",
        content: obj['google-site-verification']
      }
    ]
  }
}