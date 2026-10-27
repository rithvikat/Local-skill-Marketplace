function login(){
let role=document.getElementById("role").value;
document.getElementById("loginPage").classList.add("hidden");

if(role=="customer"){
document.getElementById("customerPage").classList.remove("hidden");
}
else{
document.getElementById("providerPage").classList.remove("hidden");
}
}
function logout(){
document.getElementById("customerPage").classList.add("hidden");
document.getElementById("providerPage").classList.add("hidden");
document.getElementById("loginPage").classList.remove("hidden");
}
function showCustomerHistory(){
document.getElementById("customerHistory").classList.toggle("hidden");
}
function showProviderHistory(){
document.getElementById("providerHistory").classList.toggle("hidden");
}