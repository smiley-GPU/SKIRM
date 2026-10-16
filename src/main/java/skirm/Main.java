package skirm;

import skirm.game.Game;
import skirm.server.GameServer;

import java.nio.file.Files;
import java.nio.file.Path;

public final class Main {
    public static void main(String[] args) throws Exception {
        int port = 8080;
        Long seed = null;
        Path web = Path.of("web");
        for (int i = 0; i < args.length; i++) {
            switch (args[i]) {
                case "--port" -> port = Integer.parseInt(args[++i]);
                case "--seed" -> seed = Long.parseLong(args[++i]);
                case "--web" -> web = Path.of(args[++i]);
                default -> {
                    System.err.println("Usage: skirm.Main [--port 8080] [--seed N] [--web ./web]");
                    System.exit(2);
                }
            }
        }
        if (!Files.isDirectory(web)) {
            System.err.println("Static directory not found: " + web.toAbsolutePath() + " (run from the project root or pass --web)");
            System.exit(1);
        }
        long s = seed != null ? seed : System.nanoTime();
        new GameServer(new Game(s), web).start(port);
        System.out.println("SKIRM running at http://localhost:" + port + "/  (campaign seed " + s + ")");
    }
}
