const parseMessage = msg =>
  msg && {
    id:             msg.id,
    streamName:     msg.stream_name,
    type:           msg.type,
    position:       Number(msg.position),
    globalPosition: Number(msg.global_position),
    data:           JSON.parse(msg.data),
    metadata:       JSON.parse(msg.metadata),
    time:           msg.time
  }

module.exports = parseMessage
