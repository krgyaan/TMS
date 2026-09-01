import{c as s,a5 as l,a6 as o,a7 as n,x as d,o as i}from"./main-CXf9gvvn.js";import{s as u}from"./errorToast-D_Nqflcw.js";/**
 * @license lucide-react v0.542.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const c=[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}]],k=s("calendar",c);/**
 * @license lucide-react v0.542.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y=[["path",{d:"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z",key:"r04s7s"}]],v=s("star",y);/**
 * @license lucide-react v0.542.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p=[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]],M=s("triangle-alert",p),a={all:["tenders"],lists:()=>[...a.all,"list"],details:()=>[...a.all,"detail"],detail:e=>[...a.details(),e],list:e=>[...a.lists(),{filters:e}],dashboardCounts:()=>[...a.all,"dashboard-counts"]},_=e=>i({queryKey:e?a.detail(e):a.detail(0),queryFn:()=>n.getById(e),enabled:!!e}),q=()=>{const e=l();return o({mutationFn:({id:r,data:t})=>n.update(r,t),onSuccess:(r,t)=>{e.invalidateQueries({queryKey:a.lists()}),e.invalidateQueries({queryKey:a.detail(t.id)}),d.success("Tender updated successfully")},onError:u})};export{k as C,v as S,M as T,_ as a,q as u};
