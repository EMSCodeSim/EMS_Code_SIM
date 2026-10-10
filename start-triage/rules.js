/* Adult START training rules. Educational use; agency protocol review required. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;root.StartTriageRules=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
function classify(p){
 if(!p||typeof p!=="object")throw Error("Patient required");
 if(p.walks===true)return "green";
 if(p.walks!==false)return null;
 if(p.breathing===false){
   if(p.airwayRepositioned!==true)return null;
   return p.breathesAfterAirway===true?"red":p.breathesAfterAirway===false?"black":null;
 }
 if(p.breathing!==true)return null;
 if(!Number.isFinite(p.respiratoryRate)||p.respiratoryRate<0)return null;
 if(p.respiratoryRate>30)return "red";
 if(p.radialPulse===false||p.capillaryRefillSeconds>2)return "red";
 if(p.radialPulse!==true&&(!Number.isFinite(p.capillaryRefillSeconds)||p.capillaryRefillSeconds<0))return null;
 if(typeof p.followsCommands!=="boolean")return null;
 return p.followsCommands?"yellow":"red";
}
return Object.freeze({classify});
});
