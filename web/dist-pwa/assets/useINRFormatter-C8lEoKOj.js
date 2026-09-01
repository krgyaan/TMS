const n=new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",minimumFractionDigits:2,maximumFractionDigits:2}),e=t=>{const r=Number(t);return isNaN(r)?"₹0":n.format(r)};export{e as f};
