import { Canvas, Text } from 'rubickjs'

const cnavsa = new Canvas({
  view: document.querySelector('canvas'),
})

cnavsa.addChild(new Text('Hello, World!'))

cnavsa.start()
