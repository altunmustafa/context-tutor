FROM golang:1.27.0-alpine3.24 AS build

WORKDIR /src
COPY go.mod ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/context-tutor-api ./cmd/api

FROM alpine:3.24.0 AS runtime

RUN addgroup -S -g 10001 app && adduser -S -D -H -u 10001 -G app app
COPY --from=build /out/context-tutor-api /usr/local/bin/context-tutor-api

USER app
EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/context-tutor-api"]
