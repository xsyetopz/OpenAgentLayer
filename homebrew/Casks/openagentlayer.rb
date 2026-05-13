cask "openagentlayer" do
  version "0.7.0-beta.1"
  sha256 :no_check

  url "https://github.com/xsyetopz/OpenAgentLayer/releases/download/v#{version}/openagentlayer-#{version}-macos-universal.tar.gz"
  name "OpenAgentLayer"
  desc "Generator and deployer for Claude Code, Codex, and OpenCode agent layers"
  homepage "https://github.com/xsyetopz/OpenAgentLayer"

  livecheck do
    url :url
    strategy :github_latest
  end

  depends_on formula: "bun"

  binary "bin/oal", target: "oal"
  binary "bin/opendex", target: "opendex"

  caveats do
    <<~EOS
      Run `oal check` after installation to verify provider configuration.
      Use `oal preview --provider all` before deploying generated artifacts.
    EOS
  end
end
