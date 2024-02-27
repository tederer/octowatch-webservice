/* global common, assertNamespace, Headers, fetch */

assertNamespace('common');

common.Http = function Http() {
   this.get = async function get(url) {
      return new Promise((resolve, reject) => {
         var options = {method: 'GET'};

         fetch(url, options)
            .then(response => {
               if (!response.ok) {
                  reject(new Error('HTTP GET request failed with status ' + response.status));
               }
               response.json()
                  .then(resolve)
                  .catch(err => {
                      reject(new Error('Failed to get text from response (URL=' + url + '): ' + err));
                  });
            })
            .catch(err => reject(new Error('Failed to fetch data from ' + url + ': ' + err)));
      });
   };
};
