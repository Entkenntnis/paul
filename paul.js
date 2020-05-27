// this file contains PAUL as Web Worker

var s_identity = 'i'
var s_add = '+'
var s_minus = '-'
var s_mult = '*'
var s_empty = 'x'
var s_matchin = '&'

var chars = "aA"

function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function ctoi(c) { return c.charCodeAt(0) - chars.charCodeAt(0) }
function Ctoi(c) { return c.charCodeAt(0) - chars.charCodeAt(1) }
function itoc(i) { return String.fromCharCode(i + chars.charCodeAt(0)) }
function itoC(i) { return String.fromCharCode(i + chars.charCodeAt(1)) }

var run = true
var layers = [] // array of arrays of strings
var resultState = [] // array of arrays of strings
var maxMatchInDepth = 2

function maxMatchInLength() { return layers[0].length / 2 }

function splitPair(pair) {
  var spaceIndex = -1
  var input = pair.split('')
  var s = 0
  for (var i = 1; i < pair.length; i++) {
    if (input[i] == '(')
      s++
    if (input[i] == ')')
      s--
    if (s == 0 && input[i] == ' ') {
      spaceIndex = i
      break
    }
  }
  return [
    pair.substr(1, spaceIndex - 1),
    pair.substr(spaceIndex + 1, pair.length - spaceIndex - 2)
  ]
}

function Main(data) {
  var val = Prepare(data)
  if (val === true) {
    if (Search(1,0))
        return Output(resultState)
      else
        return '[Sorry, kein Ergebnis, vielleicht mit mehr Zahlen probieren]'
  } else
    return val
}

function Prepare(text) {
  var input = text.split(' ')
  for (var i = 0; i < input.length; i++) {
    if (!isNumeric(input[i])) {
      return 'bitte Zahlen eingeben, mit Leerzeichen trennen'
    }
  }
  if (input.length < 2) {
    return 'mind. 2 Zahlen'
  }
  layers = []
  layers.push(input)
  
  for (var row = input.length - 1; row > 0; row--) {
    var curLayer = []
    for (var col = 0; col < row; col++)
      curLayer.push("")
    layers.push(curLayer)
  }
  
  return true
}

function Check2(a, b) {
  var rules = []
  if (a == s_empty || b == s_empty)
    return rules
  if (a == b)
    rules.push(s_identity)
  if (isNumeric(a) && isNumeric(b)) {
    a = parseInt(a)
    b = parseInt(b)
    rules.push('(' + s_add + ' ' + (b - a) + ')')
    rules.push('(' + s_minus + ' ' + (-(a + b)) + ')')
    if (a != 0 && b != 0 && Math.floor(b / a) * a == b)
      rules.push('(' + s_mult + ' ' + (b / a) + ')')
  }
  return rules
}

function CheckTree(a, b, row, col) {
  //console.log("Debug Tree(" + row + "," + col + "): " + a + " and " + b)
  var rules = []
  var previousRow = row - 1
  for (var matchRow = previousRow; matchRow > previousRow - maxMatchInDepth && matchRow >= 0; matchRow--) {
    for (var matchCol = col; matchCol > col - maxMatchInLength() && matchCol >= 0; matchCol--) {
      if (b != s_empty && layers[matchRow][matchCol] == b) {
        var rowC = itoC(previousRow - matchRow)
        var colc = itoc(col - matchCol)
        if (!(rowC == 'A' && colc == 'a'))
          rules.push('(' + s_matchin + ' ' + rowC + colc + ')')
      }
    }
  }
  if (a.startsWith('(') && b.startsWith('(')) {
    var partsA = splitPair(a)
    var partsB = splitPair(b)
    if (partsA.length == 2 && partsB.length == 2) {
      var r1 = CheckTree(partsA[0], partsB[0], row, col)
      var r2 = CheckTree(partsA[1], partsB[1], row, col)
      r1.forEach(function(e1){
        r2.forEach(function(e2){
          if (e1.indexOf(s_matchin) < 0)
            rules.push('(' + e1 + ' ' + e2 + ')')
        })
      })
    }
  } else
    rules = rules.concat(Check2(a, b))
  rules.reverse()
  return rules
}

function isId(input) {
  var parts = input.split(/ |\(|\)/)
  var result = true
  parts.forEach(function(part){
    if (part.length > 0 && !(part == s_identity))
      result = false
  })
  return result
}

function Search(row, col) {
  //console.log(JSON.stringify(layers))
  if (col >= layers.length - row) {
    var isRegular = true
    var emptyCount = 0
    for (var i = 0; i < col; i++) {
      if (layers[row][i] == s_empty)
        ++emptyCount
      else if (!isId(layers[row][i]))
        isRegular = false
    }
    var pattern = layers[row-1][layers[row-1].length - 1]
    var tolerateEmptys = -1
    var index = pattern.indexOf(s_matchin)
    if (index >= 0) {
      var substr = pattern.substr(index)
      var charArray = splitPair(substr)[1].split('')
      tolerateEmptys = ctoi(charArray[1])
    }
    if (tolerateEmptys < 0 || emptyCount > tolerateEmptys)
      if (emptyCount > 0) isRegular = false
    if (isRegular) {
      resultState = []
      for (var i = 0; i < row; i++)
        resultState.push(layers[i].splice(0,col))
      return true
    } else if (row < layers.length - 1)
      return Search(row + 1, 0)
    return false
  }
  var choices = CheckTree(layers[row-1][col], layers[row-1][col+1], row, col)
  if (choices.length == 0 && col < maxMatchInLength() - 1 && col < layers[row].length - 1) {
    layers[row][col] = s_empty
    return Search(row, col + 1)
  }
  for (var i = 0; i < choices.length; i++) {
    layers[row][col] = choices[i]
    if (Search(row, col + 1))
      return true
  }
  return false
}

function ApplyRule(rule, input, state, row) {
  if (rule == s_identity) return input
  var op = splitPair(rule)
  if (op[0] == s_add) return (parseInt(input) + 0 + parseInt(op[1])).toString()
  if (op[0] == s_mult) return (parseInt(input) * parseInt(op[1])).toString()
  if (op[0] == s_minus) return (-(parseInt(input) + parseInt(op[1]))).toString()
  if (op[0] == s_matchin) {
    var offsets = op[1].split('')
    var rowIndex = row - Ctoi(offsets[0])
    var colIndex = state[row].length - 1 - ctoi(offsets[1])
    return state[rowIndex][colIndex]
  }
  var val = splitPair(input)
  return '(' + ApplyRule(op[0], val[0], state, row) + ' ' + ApplyRule(op[1], val[1], state, row) + ')'
}

function Grow(state) {
  var topLayer = state[state.length-1]
  topLayer.push(topLayer[topLayer.length-1])
  for (var i = state.length - 2; i >= 0; i--)
    state[i].push(ApplyRule(state[i+1][state[i+1].length-2], state[i][state[i].length-1], state, i))
}

function Output(state) {
  var explainer = ""
  for(var i = state.length - 1; i > 0; i--)
    explainer = state[i].join(' ') + "<br>" + explainer
  while (state[0].length < 20) Grow(state)
  var result = state[0].join(' ') + "\n"
  return result + '#' + explainer
}
