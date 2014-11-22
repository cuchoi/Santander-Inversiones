// Variables Globales
var tablaInversiones;
var Rut;
var Clave;
var ultimoDia;
var diaActual;
var Fondos = [];
var montoFondos;
var nombreFondos;
var totalInversiones;

var santanderAPI = {

  logIn: function(click,automatico){

console.log(automatico);
   
    if(!automatico){
      console.log("notauto");
    Rut = document.getElementById('rut').value;
    Clave = document.getElementById('password').value;
    guardarFormulario(Rut,Clave);
          $('.titulo').hide(0);
      $('#login').hide(0);
      $('#content').append("<center><img src='perro.gif'><br><h3>Loading...</h3></center>");

    }
    else {
    console.log("auto");

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

    xhr.open("POST","https://www.santander.cl/transa/cruce.asp",true);
    xhr.setRequestHeader("Content-type","application/x-www-form-urlencoded");
    xhr.send("d_rut=&d_pin=&hrut=&pass=&rut="+Rut+"&IDLOGIN=BancoSantander&tipo=0&pin="+Clave+"&usateclado=si&dondeentro=home&rslAlto=800&rslAncho=1280");

  },

  requestSaldosConsolidados: function(desdeSantander) {
      
    // Imagen de loading
    $('#content').html("<center><img src='perro.gif'><br><h3>Loading...</h3></center>");
    
    // Pedirmos el balance, chequeando que el usuario esté logeado
    
    if(typeof montoFondos !== "undefined"  && typeof nombreFondos!== "undefined"){
      console.log("dsa");
      santanderAPI.construirTabla();
    }
    
    else {
      $.get(
      'https://www.santander.cl/transa/productos/CNSLD/saldocN.asp', 

      function( my_var ) {    
    
        var el = $( '<div></div>' );
        el.html(my_var);

        if(!(typeof $('.bold_n',el)[0] === "undefined") && $('.bold_n',el)[0].innerHTML.indexOf("Expirada") > -1){
          santanderAPI.logIn();
        }
        
        else{
          // Sacar los puntos 
          montoFondos = $('.td_d',el).html(function(i, text) { 
            var re = new RegExp('\\.', 'g');
            return text.replace(re, '');
          });

          nombreFondos = $("a[title='Cartola de Fondos Mutuos']",el).html(function(i, text) { 
            return text;
          });

          totalInversiones = $('.hdr_d',el).last().text();

          santanderAPI.construirTabla();

          chrome.storage.sync.set({'tablaInversiones': tablaInversiones});
        }
      })
        .fail(function(){
          $('#content').html("<h4>Hubo un error tratando de conectarnos a la página de Santander. Intenta nuevamente.</h4>");
          chrome.tabs.create({url: "http://www.santander.cl"});
        });  

   }

  },

  construirTabla: function(){
          var valoresHtml = "<h1>Fondos Mutuos</h1>"

          // Creamos el HTML de la tabla de FFMM
          // valoresHtml += "<br>"
          valoresHtml += "<table id='ver-minimalist'><tr>";    
         
          montoFondos.each(function(valor){

            var fondo = nombreFondos[valor].innerHTML.trim();
            Fondos[valor] = fondo;

            var monto = montoFondos[valor].innerHTML.trim();
            
            valoresHtml += "<tr><td><a data-fondo='"+fondo+"' class='fondo' href='#'>"+fondo+"</a></td><td>$"+parseInt(monto).format(0,3,".")+"</td></tr>"
            
            if (typeof tablaInversiones[fondo] === 'undefined' ){
              tablaInversiones[fondo] = {};
            }
            
            tablaInversiones[fondo][formatoFecha(diaActual)] = monto;
          });
          
          valoresHtml += "</table>"

          // Agregar total
          valoresHtml += "<br> Total: $"+totalInversiones;
    
          $('#content').html(valoresHtml);

          $('.fondo').click(santanderAPI.verFondo);
    }
  ,

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
      montos.push(parseInt(tablaInversiones[fondo][dia]));
    }

    var largoDias = dias.length;
    if(largoDias === 1){
      montos.push(null);
      montos.reverse();
      montos.push(null);
      dias.push(" ");
      dias.reverse();
      dias.push(" ");
    }


    var dataFondos = {
      labels : dias,
      datasets : [
        {
          fillColor: "#fff",
          strokeColor : "#3399FF",
          pointColor : "#000",
          pointStrokeColor : "#9DB86D",
          data : montos
        }
      ]
    }

    var min = Math.min.apply(null, montos),
    max = Math.max.apply(null, montos);

        if(largoDias === 1){
          min = max;
        }

    min = min - 20000;

    if(min < 0){
      min = 0;
    }

    var escalaGrafico = {
          scaleOverride : true,
          scaleSteps : 10,
          scaleStepWidth : 5000,
          scaleStartValue : nearest(min,10000),
    }

    if(largoDias === 1){
      console.log("ds");


       new Chart(graficoFondo).MissingLine(dataFondos,escalaGrafico);

  }


  else{
    new Chart(graficoFondo).Line(dataFondos,escalaGrafico);
}

  }
};

document.addEventListener('DOMContentLoaded', function () {

  // Le damos la fecha actual
  diaActual = new Date();
  diaActual.setHours(0,0,0,0);

  $('#boton').click({automatico: false}, santanderAPI.logIn);

  chrome.storage.sync.get(['rut','clave','ultimoDia','tablaInversiones'], function(valores){
     //document.getElementById('rut').value = valores['rut'];
     //document.getElementById('password').value = valores['clave'];

     if(valores['rut'] && valores['clave']){
      Rut = valores['rut'];
      Clave = valores['clave'];
      santanderAPI.logIn(null,true);
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

/**
 * Number.prototype.format(n, x, s, c)
 * 
 * @param integer n: length of decimal
 * @param integer x: length of whole part
 * @param mixed   s: sections delimiter
 * @param mixed   c: decimal delimiter

 12345678.9.format(2, 3, '.', ',');  // "12.345.678,90"
 123456.789.format(4, 4, ' ', ':');  // "12 3456:7890"
 12345678.9.format(0, 3, '-');       // "12-345-679"

 */
Number.prototype.format = function(n, x, s, c) {
    var re = '\\d(?=(\\d{' + (x || 3) + '})+' + (n > 0 ? '\\D' : '$') + ')',
        num = this.toFixed(Math.max(0, ~~n));

    return (c ? num.replace('.', c) : num).replace(new RegExp(re, 'g'), '$&' + (s || ','));
};

function nearest(n, v) {
  n = n / v;
  n = (n < 0 ? Math.floor(n) : Math.ceil(n)) * v;
  return n;
}


