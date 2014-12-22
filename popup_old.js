// Variables Globales
var tablaInversiones;
var Rut;
var Clave;
var ultimoDia;
var diaActual;
var Fondos = [];



var santanderAPI = {

  logIn: function(automatico){

    if(automatico){
      $('.titulo').hide(0);
      $('#login').hide(0);
      $('#content').append("<center><img src='perro.gif'><br><h3>Loading...</h3></center>");
    }    

    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange=function() {
      if (xhr.readyState==4 && xhr.status==200) {
        santanderAPI.requestSaldosConsolidados();
      }
    }

    Rut = document.getElementById('rut').value;
    Clave = document.getElementById('password').value;

    guardarFormulario(Rut,Clave);

    console.log(Rut);
    console.log(Clave);

    xhr.open("POST","https://www.santander.cl/transa/cruce.asp",true);
    xhr.setRequestHeader("Content-type","application/x-www-form-urlencoded");
    xhr.send("d_rut=&d_pin=&hrut=&pass=&rut="+Rut+"&IDLOGIN=BancoSantander&tipo=0&pin="+Clave+"&usateclado=si&dondeentro=home&rslAlto=800&rslAncho=1280");

  },

  requestSaldosConsolidados: function() {
    
    // Imagen de loading
    $('#content').html("<center><img src='perro.gif'><br><h3>Loading...</h3></center>");
    
    // Pedirmos el balance, chequeando que el usuario esté logeado
    $.get(
      'https://www.santander.cl/transa/productos/CNSLD/saldocN.asp', 

      function( my_var ) {    
    
        var el = $( '<div></div>' );
        el.html(my_var);

        if(!(typeof $('.bold_n',el)[0] === "undefined") && $('.bold_n',el)[0].innerHTML.indexOf("Expirada") > -1){
          logInSantander();
        }
        
        else{
          // Sacar los puntos	
          var montoFondos = $('.td_d',el).html(function(i, text) { 
            var re = new RegExp('\\.', 'g');
            return text.replace(re, '');
          });

          var nombreFondos = $("a[title='Cartola de Fondos Mutuos']",el).html(function(i, text) { 
            return text;
          });

          var valoresHtml = "<h1>Fondos Mutuos</h1>"

          // Creamos el HTML de la tabla de FFMM
          valoresHtml += "<br>"
          valoresHtml += "<table><tr>";    
         
          montoFondos.each(function(valor){

          	var fondo = nombreFondos[valor].innerHTML.trim();
            Fondos[valor] = fondo;

          	var monto = montoFondos[valor].innerHTML.trim();
            
            valoresHtml += "<tr><td><a data-fondo='"+fondo+"' class='fondo' href='#'>"+fondo+"</a></td><td>"+monto+"</td></tr>"
            
            if (typeof tablaInversiones[fondo] === 'undefined' ){
              tablaInversiones[fondo] = {};
        	  }
            
            tablaInversiones[fondo][formatoFecha(diaActual)] = monto;
          });
          
 		  chrome.storage.sync.set({'tablaInversiones': tablaInversiones});
          valoresHtml += "</table>"

          // Agregar total
          valoresHtml += "<br> Total: "+$('.hdr_d',el).last().text();
    
          $('#content').html(valoresHtml);

          $('.fondo').click(santanderAPI.verFondo);

        }
      })
        .fail(function(){
          $('#content').html("<h4>Hubo un error tratando de conectarnos a la página de Santander. Intenta nuevamente.</h4>");
          chrome.tabs.create({url: "http://www.santander.cl"});
        });

  },

  verFondo: function(){
    var fondo = $(this).data('fondo');

    // Cargar Canvas para dibujar gráfico

    $('#content').html('<h2>'+fondo+'</h2><br><canvas id="graficoFondo" width="280" height="250"></canvas><br><br><button id="volver" type="button">Volver</button>');
    var graficoFondo = document.getElementById('graficoFondo').getContext('2d');
    $('#volver').click(santanderAPI.requestSaldosConsolidados);

    var dias = [];
    var montos = [];

    for(var dia in tablaInversiones[fondo]) {
      dias.push(dia);
      console.log(tablaInversiones[fondo][dia]);
      montos.push(tablaInversiones[fondo][dia]);
    }
    console.log(dias);

    console.log(montos);

    var dataFondos = {
      labels : dias,
      datasets : [
        {
          fillColor: "#fff",
          strokeColor : "#3399FF",
          pointColor : "#000",
          pointStrokeColor : "#9DB86D",
          scaleOverride: true,
          scaleSteps: 5,
          scaleStepWidth: 2000,
          data : montos
        }
      ]
    }

    var min = Math.min.apply(null, montos),
    max = Math.max.apply(null, montos);

    var escalaGrafico = {
          scaleOverride : true,
          scaleSteps : 10,
          scaleStepWidth : 5000,
          scaleStartValue : min-5000,
    }

    new Chart(graficoFondo).Line(dataFondos,escalaGrafico);


  }
};

document.addEventListener('DOMContentLoaded', function () {

  // Le damos la fecha actual
  diaActual = new Date();
  diaActual.setHours(0,0,0,0);

  document.getElementById("boton").addEventListener("click",santanderAPI.logIn);

  chrome.storage.sync.get(['rut','clave','ultimoDia','tablaInversiones'], function(valores){
     document.getElementById('rut').value = valores['rut'];
     document.getElementById('password').value = valores['clave'];

     if(valores['rut'] && valores['clave']){
      santanderAPI.logIn(true);
     }

     // Recopilamos el última día en que se metió
     if(valores['ultimoDia']){
      ultimoDia = valores['ultimoDia'];     
     }

     if(valores['tablaInversiones']){
      tablaInversiones = valores['tablaInversiones'];     
     }

     else{
     	tablaInversiones = {};
     }

  });

  // santanderAPI.logIn();
});

function logInSantanderAlternativo() {
  $('#content').html("<h4>Debes estar logeado a Santander.cl para poder usar esta extension</h4>");
  
  chrome.tabs.create({url: "http://www.santander.cl"});
  setTimeout(llenarDatos, 3000) //wait ten seconds before continuing
};


function guardarFormulario(RutAGuardar, ClaveAGuardar) {

  if (!RutAGuardar) {
    message('Error: Debe ingresar un rut');
    return;
  }

   if (!ClaveAGuardar) {
    message('Error: Debe ingresar una clave');
    return;
  }
  // Save it using the Chrome extension storage API.
  chrome.storage.sync.set({'rut': RutAGuardar});
  chrome.storage.sync.set({'clave': ClaveAGuardar});

};


// Transforma un objeto Date a un string AAAA-MM-DD
function formatoFecha(fecha){
  return fecha.getFullYear()+"-"+(fecha.getMonth()+1)+"-"+fecha.getDate();
};

// Transforma un texto de la forma AAAA-MM-DD a un objeto Date
function transformarAObjetoFecha(fecha){
  datosFecha = fecha.split("-");
  return new Date(datosFecha[0], datosFecha[1], datosFecha[2]);
};


