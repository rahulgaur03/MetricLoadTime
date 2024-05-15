using ElectronNET.API;
using ElectronNET.API.Entities;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseElectron(args);

builder.Services.AddControllers();

var app = builder.Build();

app.UseCors(policy =>
{
    policy.AllowAnyOrigin()
          .AllowAnyHeader()
          .AllowAnyMethod();
});

var browserWindowOptions = new BrowserWindowOptions
{
    AutoHideMenuBar = true ,
    Width = 1400,
    Height = 1000
};

await Electron.WindowManager.CreateWindowAsync(browserWindowOptions);
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.MapFallbackToFile("/index.html");

app.Run();
app.WaitForShutdown();