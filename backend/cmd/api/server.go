package main

import (
	"context"
	"errors"
	"net"
	"net/http"
	"time"
)

// runServer owns the listener and waits for shutdown before returning.
func runServer(ctx context.Context, server *http.Server, listener net.Listener, timeout time.Duration) error {
	serveDone := make(chan error, 1)
	go func() {
		serveDone <- server.Serve(listener)
	}()

	select {
	case err := <-serveDone:
		return err
	case <-ctx.Done():
	}

	shutdownContext, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()
	err := server.Shutdown(shutdownContext)
	if err != nil {
		// The graceful deadline expired; close remaining connections explicitly.
		err = errors.Join(err, server.Close())
	}
	serveErr := <-serveDone
	if !errors.Is(serveErr, http.ErrServerClosed) {
		err = errors.Join(err, serveErr)
	}
	return err
}
