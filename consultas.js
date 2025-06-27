use festival_conciertos;

//======================================
//       1. EXPRESIONES REGULARES
//======================================
//Buscar bandas cuyo nombre empiece por la letra “A”
db.bandas.find({ nombre: { $regex: /^A/, $options: 'i' } });

//Buscar asistentes cuyo nombre contenga "Gomez"
db.asistentes.find({ nombre: { $regex: /Gómez/, $options: 'i' } });


// ======================================
//     2. OPERADORES DE ARREGLOS
// ======================================
//Buscar asistentes que tengan "Rock" dentro de su campo generos_favoritos
db.asistentes.find({ generos_favoritos: "Rock" });


// ======================================
//    3. AGGREGATION FRAMEWORK
// ======================================
//Agrupar presentaciones por escenario y contar cuántas presentaciones hay f
db.presentaciones.aggregate([
  {
    $group: {
      _id: "$escenario",
      total_presentaciones: { $sum: 1 }
    }
  }
]);

//Calcular el promedio de duración de las presentaciones
db.presentaciones.aggregate([
  {
    $group: {
      _id: null,
      promedio_duracion: { $avg: "$duracion_minutos" }
    }
  }
]);


// ======================================
//     4. FUNCIONES EN system.js
// ======================================

//Función escenariosPorCiudad devuelve todos los escenarios en esa ciudad
db.system.js.save({
  _id: "escenariosPorCiudad",
  value: function(ciudad) {
    return db.escenarios.find({ ciudad: ciudad }).toArray();
  }
});

//Función bandasPorGenero(genero): devuelve todas las bandas activas de ese género
db.system.js.save({
  _id: "bandasPorGenero",
  value: function(genero) {
    return db.bandas.find({ genero: genero, activa: true }).toArray();
  }
});


// ======================================
// 5. TRANSACCIONES (REPLICA SET REQUERIDO)
// ======================================

//Simular compra de un boleto:
const session = db.getMongo().startSession();
session.startTransaction();

try {
  const asistentes = session.getDatabase("festival_conciertos").asistentes;
  const escenarios = session.getDatabase("festival_conciertos").escenarios;
  asistentes.updateOne(
    { nombre: "María Gómez" },
    { $push: { boletos_comprados: { escenario: "Escenario Principal", dia: "2025-06-22" } } }
  );

  //Disminuir capacidad en escenario correspondiente
  escenarios.updateOne(
    { nombre: "Escenario Principal" },
    { $inc: { capacidad: -1 } }
  );

  session.commitTransaction();
} catch (e) {
  session.abortTransaction();
  print("Transacción fallida:", e);
} finally {
  session.endSession();
}


//Reversar la compra
const session2 = db.getMongo().startSession();
session2.startTransaction();

try {
  const asistentes = session2.getDatabase("festival_conciertos").asistentes;
  const escenarios = session2.getDatabase("festival_conciertos").escenarios;
  
  asistentes.updateOne(
    { nombre: "María Gómez" },
    { $pull: { boletos_comprados: { escenario: "Escenario Principal", dia: "2025-06-22" } } }
  );

  escenarios.updateOne(
    { nombre: "Escenario Principal" },
    { $inc: { capacidad: 1 } }
  );

  session2.commitTransaction();
} catch (e) {
  session2.abortTransaction();
  print("Reverso fallido:", e);
} finally {
  session2.endSession();
}


// ======================================
//    6. ÍNDICES + CONSULTAS
// ======================================

//Crear índice en bandas.nombre y buscar una banda específica
db.bandas.createIndex({ nombre: 1 });
db.bandas.find({ nombre: "ChocQuibTown" });

//Crear índice en presentaciones.escenario y contar cuántas presentaciones hubo
db.presentaciones.createIndex({ escenario: 1 });
db.presentaciones.countDocuments({ escenario: "Tarima Caribe" });        

//Crear índice compuesto en asistentes.ciudad y edad, y consultar asistentes de Bogotá menores de 30
db.asistentes.createIndex({ ciudad: 1, edad: 1 });
db.asistentes.find({ ciudad: "Bogotá", edad: { $lt: 30 } });

