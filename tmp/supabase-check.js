var xhr = new ActiveXObject(\"MSXML2.XMLHTTP\");
var url = \"https://wqqygppadqecwwznocny.supabase.co/rest/v1/refeicoes_consumidas?select=*^&limit=1\";
var key = \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxcXlncHBhZHFlY3d3em5vY255Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNzA2NzUsImV4cCI6MjA3ODY0NjY3NX0.kd4GwZbeocmtCov2poUjI9ZiseqO0OM6Beg_UsIMPmk\";
xhr.open(\"GET\", url, false);
xhr.setRequestHeader(\"apikey\", key);
xhr.setRequestHeader(\"Authorization\", \"Bearer \" + key);
xhr.send();
WScript.Echo(xhr.status);
WScript.Echo(xhr.responseText);
