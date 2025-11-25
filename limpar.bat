@echo off
echo ============================================================
echo   🚀 Limpando histórico Git e recriando repositório limpo
echo ============================================================
echo.

:: Etapa 1 - Apagar o histórico Git local
echo 🔹 Removendo pasta .git antiga...
rmdir /s /q .git

:: Etapa 2 - Iniciar um novo repositório
echo 🔹 Criando novo repositório Git...
git init

:: Etapa 3 - Adicionar todos os arquivos
echo 🔹 Adicionando arquivos ao novo commit...
git add .

:: Etapa 4 - Criar commit inicial limpo
git commit -m "Recriando repositório limpo (sem chaves sensíveis)"

:: Etapa 5 - Garantir que a branch principal é 'main'
git branch -M main

:: Etapa 6 - Conectar ao repositório remoto
set /p REPO_URL=Digite a URL do repositório remoto (ex: https://github.com/usuario/repositorio.git): 
git remote add origin %REPO_URL%

:: Etapa 7 - Enviar para o GitHub (forçando substituição do histórico antigo)
echo 🔹 Enviando código limpo para o GitHub...
git push -u origin main --force

echo.
echo ✅ Processo concluído com sucesso!
echo 🔒 Dica: adicione .env ao .gitignore e configure variáveis na Vercel.
pause
