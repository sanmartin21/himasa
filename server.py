from __future__ import annotations

import argparse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Servidor local para o sistema de planejamento de producao."
    )
    parser.add_argument("--host", default="127.0.0.1", help="Endereco de bind.")
    parser.add_argument("--port", type=int, default=8000, help="Porta HTTP.")
    args = parser.parse_args()

    server = ThreadingHTTPServer((args.host, args.port), SimpleHTTPRequestHandler)
    print(
        f"Sistema disponivel em http://{args.host}:{args.port} "
        "(Ctrl+C para encerrar)"
    )
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nEncerrando servidor...")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
