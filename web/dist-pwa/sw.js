/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-d488705a'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "ve_logo.png",
    "revision": "817ebfadb16bfa7a63dd7426f606a2e0"
  }, {
    "url": "ve_favicon.png",
    "revision": "6f4969a8ace1f6cf79a252f639cd0902"
  }, {
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  }, {
    "url": "index.pwa.html",
    "revision": "ce15839633b9d8c76026eaa496812dc4"
  }, {
    "url": "arju-boi.png",
    "revision": "62f7f838ce21dcf8cdfe9627e28dcec1"
  }, {
    "url": "pwa-icons/icon-maskable-512x512.png",
    "revision": "a5fb7db3b7e905deb484edc4959b5ca6"
  }, {
    "url": "pwa-icons/icon-512x512.png",
    "revision": "6a2e8b7caacc4e53d7f979400565b9bb"
  }, {
    "url": "pwa-icons/icon-192x192.png",
    "revision": "5597243db85c4bf8b0e7bab675d050b9"
  }, {
    "url": "assets/useUsers-DN-5UuWl.js",
    "revision": null
  }, {
    "url": "assets/useTenders-BCft31eM.js",
    "revision": null
  }, {
    "url": "assets/useSelectOptions-D7f6aTkQ.js",
    "revision": null
  }, {
    "url": "assets/usePersistentTableState-DVFWuhtK.js",
    "revision": null
  }, {
    "url": "assets/useLocations-QLyrBOyH.js",
    "revision": null
  }, {
    "url": "assets/useLeads-CEoVdwSW.js",
    "revision": null
  }, {
    "url": "assets/useLeadEnquiry-B_176pOk.js",
    "revision": null
  }, {
    "url": "assets/useInfoSheets-CQXHcUNY.js",
    "revision": null
  }, {
    "url": "assets/useINRFormatter-C8lEoKOj.js",
    "revision": null
  }, {
    "url": "assets/useHappyCalling-IlqXjtBj.js",
    "revision": null
  }, {
    "url": "assets/useFormatedDate-8knD0qdf.js",
    "revision": null
  }, {
    "url": "assets/useDebouncedSearch-Cu0tM_Vc.js",
    "revision": null
  }, {
    "url": "assets/useClientDirectory-CahYR_kS.js",
    "revision": null
  }, {
    "url": "assets/useBidSubmissions-NvGG-lZL.js",
    "revision": null
  }, {
    "url": "assets/triangle-alert-BnFtumgP.js",
    "revision": null
  }, {
    "url": "assets/trash-2-BwQev54h.js",
    "revision": null
  }, {
    "url": "assets/textarea-ttiD1xvp.js",
    "revision": null
  }, {
    "url": "assets/tabs-ByuthGh2.js",
    "revision": null
  }, {
    "url": "assets/square-pen-C04lheIa.js",
    "revision": null
  }, {
    "url": "assets/shield-alert-BdcLfqVr.js",
    "revision": null
  }, {
    "url": "assets/send-CX5Abdbw.js",
    "revision": null
  }, {
    "url": "assets/search-BXHBdDHD.js",
    "revision": null
  }, {
    "url": "assets/save-HqJxLoT8.js",
    "revision": null
  }, {
    "url": "assets/plus-Du4FQWOW.js",
    "revision": null
  }, {
    "url": "assets/pencil-BMgOj7Dl.js",
    "revision": null
  }, {
    "url": "assets/message-circle-yVjTFw8J.js",
    "revision": null
  }, {
    "url": "assets/index-DMJqG0r3.css",
    "revision": null
  }, {
    "url": "assets/index-BgYyokae.js",
    "revision": null
  }, {
    "url": "assets/index-BP8_wRAF.js",
    "revision": null
  }, {
    "url": "assets/imprest.hooks-OeJ_YVVQ.js",
    "revision": null
  }, {
    "url": "assets/format-CSQe5d3I.js",
    "revision": null
  }, {
    "url": "assets/file-x-2-CPgIlfdb.js",
    "revision": null
  }, {
    "url": "assets/file-question-mark-C7fFNwt2.js",
    "revision": null
  }, {
    "url": "assets/file-check-mSviy9Is.js",
    "revision": null
  }, {
    "url": "assets/errorToast-DXsdS3xF.js",
    "revision": null
  }, {
    "url": "assets/dialog-BWLagPbP.js",
    "revision": null
  }, {
    "url": "assets/data-table-6HwaDZaa.css",
    "revision": null
  }, {
    "url": "assets/data-table-3gFLDxp2.js",
    "revision": null
  }, {
    "url": "assets/contactpersonform-DIxv8M9t.js",
    "revision": null
  }, {
    "url": "assets/compat-BNjhwUDn.js",
    "revision": null
  }, {
    "url": "assets/coerce-BD1jtbSz.js",
    "revision": null
  }, {
    "url": "assets/circle-x-CMurb1Tb.js",
    "revision": null
  }, {
    "url": "assets/circle-check-big-dv-PHEM4.js",
    "revision": null
  }, {
    "url": "assets/briefcase-ipi5gfgz.js",
    "revision": null
  }, {
    "url": "assets/badge-DM0OO9QB.js",
    "revision": null
  }, {
    "url": "assets/WhatsappTab-q0fCy9S1.js",
    "revision": null
  }, {
    "url": "assets/VoucherViewPage-D4Wmnpn2.js",
    "revision": null
  }, {
    "url": "assets/VoucherListPage-DepiNFpP.js",
    "revision": null
  }, {
    "url": "assets/UserImprestsPage-DRT7dAKZ.css",
    "revision": null
  }, {
    "url": "assets/UserImprestsPage-DQXeuIcu.js",
    "revision": null
  }, {
    "url": "assets/SelectField-B0czCDg4.js",
    "revision": null
  }, {
    "url": "assets/PaymentHistoryPage-Dk4djcDJ.js",
    "revision": null
  }, {
    "url": "assets/LeadsListPage-VPO4yrKm.js",
    "revision": null
  }, {
    "url": "assets/LeadShowPage-DI9CQ-0c.js",
    "revision": null
  }, {
    "url": "assets/LeadForm-todezTeQ.js",
    "revision": null
  }, {
    "url": "assets/LeadForm-CIGW-MKW.css",
    "revision": null
  }, {
    "url": "assets/LeadFollowupListPage-C_ryr_Pc.js",
    "revision": null
  }, {
    "url": "assets/LeadEnquiryListPage-HPL0iumD.js",
    "revision": null
  }, {
    "url": "assets/LeadEnquiryForm-uo9x2Z1r.js",
    "revision": null
  }, {
    "url": "assets/LeadEnquiryEditPage-BQZdM5PI.js",
    "revision": null
  }, {
    "url": "assets/LeadEnquiryCreatePage-qdOHFEre.js",
    "revision": null
  }, {
    "url": "assets/LeadEditPage-DFES5oVO.js",
    "revision": null
  }, {
    "url": "assets/LeadCreatePage-DQhA-OHD.js",
    "revision": null
  }, {
    "url": "assets/ImprestForm-DvZiOyyn.js",
    "revision": null
  }, {
    "url": "assets/HappyCallingShowPage-fDxluC2x.js",
    "revision": null
  }, {
    "url": "assets/HappyCallingListPage-8cddb1nL.js",
    "revision": null
  }, {
    "url": "assets/HappyCallingForm-B5Ju8fFv.js",
    "revision": null
  }, {
    "url": "assets/HappyCallingFollowupPage-Dza0g6G-.js",
    "revision": null
  }, {
    "url": "assets/HappyCallingEnquiryCreatePage-D8_0hmJ1.js",
    "revision": null
  }, {
    "url": "assets/HappyCallingEditPage-6MgEYW4T.js",
    "revision": null
  }, {
    "url": "assets/HappyCallingCreatePage-BJb4vdDq.js",
    "revision": null
  }, {
    "url": "assets/FileUploader-BF79IGVz.js",
    "revision": null
  }, {
    "url": "assets/EnquiryWithLeadCreatePage-DQv9a-IN.js",
    "revision": null
  }, {
    "url": "assets/EnquiryTenderFlow-PMRdaMlA.js",
    "revision": null
  }, {
    "url": "assets/EnquiryQuotationFollowupPage-irnhPCut.js",
    "revision": null
  }, {
    "url": "assets/EditImprestPage-C7cV9BN2.js",
    "revision": null
  }, {
    "url": "assets/CreateImprestPage-CJ3-1eo2.js",
    "revision": null
  }, {
    "url": "assets/ClientDirectoryListPage-Csy8vdfq.js",
    "revision": null
  }, {
    "url": "assets/ActionColumnRenderer-ZIRlZnGZ.js",
    "revision": null
  }, {
    "url": "pwa-icons/icon-192x192.png",
    "revision": "5597243db85c4bf8b0e7bab675d050b9"
  }, {
    "url": "pwa-icons/icon-512x512.png",
    "revision": "6a2e8b7caacc4e53d7f979400565b9bb"
  }, {
    "url": "pwa-icons/icon-maskable-512x512.png",
    "revision": "a5fb7db3b7e905deb484edc4959b5ca6"
  }, {
    "url": "manifest.webmanifest",
    "revision": "e294dd4d1eac0139e0732767277376e5"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.pwa.html"), {
    denylist: [/^\/api\//, /^\/uploads\//]
  }));
  workbox.registerRoute(({
    url
  }) => url.pathname.startsWith("/api/"), new workbox.NetworkFirst({
    "cacheName": "tms-api-cache",
    "networkTimeoutSeconds": 10,
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 100,
      maxAgeSeconds: 86400
    })]
  }), 'GET');
  workbox.registerRoute(({
    url
  }) => url.pathname.startsWith("/uploads/"), new workbox.CacheFirst({
    "cacheName": "tms-uploads-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 50,
      maxAgeSeconds: 604800
    })]
  }), 'GET');

}));
