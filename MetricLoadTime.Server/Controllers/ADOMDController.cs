using Microsoft.AspNetCore.Mvc;

namespace MetricLoadTime.Server.Controllers
{
    [ApiController]
    [Route("query/[controller]")]
    public class ADOMDController : ControllerBase
    {
        // GET api/calculator/add
        [HttpGet("execute")]
        public IActionResult Add(string number1, string number2)
        {
            return Ok("1");
        }

        // Add more methods for other operations like subtraction, multiplication, division, etc.
    }

public class ConnectionsValue
{
    public string? XMLAEndPoint { get; set; }
    public string? ModelName { get; set; }
}
}
