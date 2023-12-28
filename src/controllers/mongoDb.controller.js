import { ConnetMongoDB } from '../connections/mongoDb.js'
import { ItemModel, BodegaModel, MovimientoModel } from '../../Models/Models.js'

export const createItem = async (req, res) => {
  try {
    const { nombre, descripcion, placa, serial, estado } = req.body

    if (!/^MI-|^MA-/.test(placa)) {
      return res.status(400).json({ error: 'La placa debe comenzar con "MI-" o "MA-"' })
    }

    // Validar los datos de entrada
    if (!nombre || !descripcion || !placa || !serial || !estado) {
      return res.status(400).json({ error: 'Faltan campos requeridos' })
    }

    await ConnetMongoDB()

    const newItem = new ItemModel({ nombre, descripcion, placa, serial, estado })
    await newItem.save()
    res.status(201).json({ message: 'Ítem creado correctamente' })
  } catch (error) {
    console.log(error)

    if (error.code === 11000) {
      const Code = error.code
      const Value = error.keyValue[Object.keys(error.keyValue)[0]]
      return res.status(400)
        .json({ error: `Error: ${Code}, El Item ${Value} Ya Existe` })
    }

    res.status(500).json({ error: 'Error al crear el ítem' })
  }
}

export const getItems = async (req, res) => {
  try {
    await ConnetMongoDB()
    const items = await ItemModel.find()
    res.status(200).json(items)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al obtener los ítems' })
  }
}

export const createBodega = async (req, res) => {
  const { nombre, sucursal, direccion } = req.body
  try {
    // Validar los datos de entrada
    if (!nombre || !sucursal || !direccion) {
      return res.status(400).json({ error: 'Faltan campos requeridos' })
    }

    await ConnetMongoDB()

    const newBodega = new BodegaModel({ nombre, sucursal, direccion })
    await newBodega.save()
    res.status(201).json({ message: 'Bodega creada correctamente' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al crear la bodega' })
  }
}

export const getBodegas = async (req, res) => {
  try {
    await ConnetMongoDB()
    const bodegas = await BodegaModel.find().populate('items')
    res.status(200).json(bodegas)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al obtener las bodegas' })
  }
}
export const addItemToBodega = async (req, res) => {
  const { sucursal, itemId } = req.body

  try {
    await ConnetMongoDB()
    const item = await ItemModel.findById(itemId)
    if (!item) {
      res.status(404).json({ error: 'No se encontró el ítem con el ID proporcionado' })
      return
    }

    // Verifica si el ítem ya está en alguna bodega
    const existingBodega = await BodegaModel.findOne({ items: itemId })
    if (existingBodega) {
      res.status(400).json({ error: 'El ítem ya está en otra bodega' })
      return
    }

    const bodega = await BodegaModel.findOne({ sucursal })
    if (!bodega) {
      res.status(404).json({ error: 'No se encontró la bodega con la sucursal proporcionada' })
      return
    }

    bodega.items.push(item._id)
    await bodega.save()
    res.status(200).json({ message: `Ítem agregado correctamente a Bodega: ${sucursal}` })
  } catch (error) {
    return res.status(500).json({ error: 'Error al agregar el ítem a bodega', message: error })
  }
}

export const findBodegaWithItems = async (req, res) => {
  const { itemId } = req.body

  try {
    await ConnetMongoDB()
    const bodega = await BodegaModel.findOne({ items: itemId })
    if (!bodega) {
      return res.status(404).json({ error: 'No se encontró una bodega con el ítem especificado' })
    }
    res.status(200).json({ nombreBodega: bodega.nombre })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al obtener la bodega' })
  }
}

export const createMovimiento = async (req, res) => {
  try {
    const { encargado, incidente, fecha, tipo, item, bodega } = req.body

    // Validar los datos de entrada
    if (!encargado || !incidente || !fecha || !tipo || !item || !bodega) {
      return res.status(400).json({ error: 'Faltan campos requeridos' })
    }

    await ConnetMongoDB()

    const newMovimiento = new MovimientoModel({ encargado, incidente, fecha, tipo, item, bodega })
    await newMovimiento.save()
    res.status(201).json(newMovimiento)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al crear el movimiento' })
  }
}

export const getMovimientos = async (req, res) => {
  try {
    await ConnetMongoDB()
    const movimientos = await MovimientoModel.find()
    res.status(200).json(movimientos)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al obtener los movimientos' })
  }
}

export const moveItems = async (req, res) => {
  const { itemsIds, bodegaOrigen, bodegaDestino } = req.body

  try {
    await ConnetMongoDB()
    // Encuentra las bodegas
    const sourceBodega = await BodegaModel.findById(bodegaOrigen)
    const targetBodega = await BodegaModel.findById(bodegaDestino)

    // Verifica si las bodegas existen
    if (!sourceBodega || !targetBodega) {
      return res.status(404).json({ error: 'No se encontró una o ambas bodegas' })
    }

    // Mueve cada ítem del array itemsIdsmoveItems
    for (const itemId of itemsIds) {
      // Encuentra el ítem en la bodega original
      const itemIndex = sourceBodega.items.findIndex(item => item._id.toString() === itemId)

      // Verifica si el ítem existe en la bodega original
      if (itemIndex === -1) {
        return res.status(404).json({ error: `No se encontró el ítem con id ${itemId} en la bodega original` })
      }

      // Elimina el ítem de la bodega original
      const [item] = sourceBodega.items.splice(itemIndex, 1)

      // Agrega el ítem a la bodega de destino
      targetBodega.items.push(item)
    }

    // const movimientoSchema = new Schema({
    //   encargado: { type: String, required: true },
    //   incidente: { type: String, required: true },
    //   descripcion: { type: String, required: true },
    //   fecha: { type: Date, required: true },
    //   tipo: { type: String, required: true, enum: ['Entrada', 'Salida'] },
    //   items: [{ type: Schema.Types.ObjectId, ref: 'item' }],
    //   bodegaOrigen: { type: Schema.Types.ObjectId, ref: 'bodega' },
    //   bodegaDestino: { type: Schema.Types.ObjectId, ref: 'bodega' }
    // }, { timestamps: true, versionKey: false })

    // Crea el movimiento
    const movimiento = new MovimientoModel({
      encargado: 'Ivan Ortega',
      incidente: '11154',
      descripcion: 'Movimiento de ítems bodega principal a stock',
      fecha: new Date(),
      items: itemsIds,
      bodegaOrigen,
      bodegaDestino
    })
    // Guarda el movimiento
    await movimiento.save()

    // Guarda los cambios en las bodegas
    await sourceBodega.save()
    await targetBodega.save()

    res.status(200).json({ message: 'Ítems movidos con éxito' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al mover los ítems' })
  }
}

export const getBodegaSucursal = async (req, res) => {
  console.log(req.params)
  const { sucursal } = req.params
  try {
    await ConnetMongoDB()
    const bodega = await BodegaModel.findOne({ sucursal })
    res.status(200).json(bodega)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al obtener la bodega' })
  }
}