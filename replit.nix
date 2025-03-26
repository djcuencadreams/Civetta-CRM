{pkgs}: {
  deps = [
    pkgs.tree
    pkgs.wget
    pkgs.chromium
    pkgs.glibcLocales
    pkgs.unzip
    pkgs.jq
    pkgs.lsof
    pkgs.procps
    pkgs.postgresql
  ];
}
